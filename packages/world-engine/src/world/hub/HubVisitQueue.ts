/** Discrete interaction ownership for an arrival-gated Hub visit.
 *
 * The renderer owns continuous movement; this queue tracks only the building
 * to open at the end. It never emits WorldBridge events per frame.
 */
export type HubNavigationOutcome = 'moving' | 'arrived' | 'unreachable';

export class HubVisitQueue {
  private pendingId?: string;

  /** New clicks supersede pending visits, including unsuccessful requests. */
  request(
    buildingId: string,
    outcome: HubNavigationOutcome | undefined,
    gateByArrival: boolean,
  ): string | undefined {
    this.pendingId = undefined;
    if (outcome === 'unreachable') return undefined;
    if (gateByArrival && outcome === 'moving') {
      this.pendingId = buildingId;
      return undefined;
    }
    // For canonical/legacy behaviour, and an already-arrived target, open
    // the dossier synchronously (no walk animation to wait for).
    return buildingId;
  }

  /** External navigation commands or scene teardown revoke pending visits. */
  cancel(): void {
    this.pendingId = undefined;
  }

  /**
   * Consume the arrival exactly once. Calling on every render tick is safe:
   * only the transition from an outstanding pending visit emits an ID.
   */
  onMovementUpdate(isMoving: boolean): string | undefined {
    if (isMoving || this.pendingId === undefined) return undefined;
    const arrived = this.pendingId;
    this.pendingId = undefined;
    return arrived;
  }
}
