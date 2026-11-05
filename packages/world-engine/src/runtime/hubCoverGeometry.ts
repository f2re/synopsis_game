export interface HubCoverGeometry { zoom: number; cropX: number; cropY: number; visibleWidth: number; visibleHeight: number; }
export function calculateHubCoverGeometry(width: number, height: number, worldWidth=480, worldHeight=270): HubCoverGeometry {
  if (![width,height,worldWidth,worldHeight].every(n => Number.isFinite(n) && n>0)) throw new RangeError('Invalid Hub viewport');
  const zoom=Math.max(width/worldWidth,height/worldHeight);
  const visibleWidth=width/zoom, visibleHeight=height/zoom;
  return {zoom, cropX:(worldWidth-visibleWidth)/2, cropY:(worldHeight-visibleHeight)/2, visibleWidth, visibleHeight};
}
