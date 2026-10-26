function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6D2B79F5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffledIndices(length, seed) {
  const indices = Array.from({ length }, (_, index) => index);
  const random = seededRandom(seed);
  for (let index = indices.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [indices[index], indices[target]] = [indices[target], indices[index]];
  }
  return indices;
}

function responseDescriptor(definition) {
  if (definition.answer?.kind === 'numeric') return { kind: 'numeric', unit: definition.answer.unit ?? null };
  if (definition.answer?.kind === 'choice_index') return { kind: 'choice' };
  if (definition.type === 'sequence') return { kind: 'sequence' };
  if (definition.type === 'stationPlot' && definition.answer?.kind === 'station_plot') return { kind: 'stationPlot' };
  if (definition.type === 'stationBoard' && definition.answer?.kind === 'station_board') return { kind: 'stationBoard' };
  if (definition.type === 'findError' && definition.answer?.kind === 'station_id') return { kind: 'findError' };
  return { kind: definition.type };
}

function validatePlacementDefinition(definition, expectedKind, typeName) {
  const observations = definition.payload?.observations;
  const slots = definition.payload?.slots;
  const placements = definition.answer?.placements;
  if (!Array.isArray(observations) || !Array.isArray(slots) || definition.answer?.kind !== expectedKind || !placements || typeof placements !== 'object') {
    throw new Error(`Некорректное задание ${typeName}: ${definition.id}`);
  }
  const observationIds = new Set(observations.map((item) => item?.id));
  const slotIds = new Set(slots.map((item) => item?.id));
  for (const [observationId, slotId] of Object.entries(placements)) {
    if (!observationIds.has(observationId) || !slotIds.has(slotId)) {
      throw new Error(`Некорректное соответствие ${typeName} ${definition.id}: ${observationId} -> ${slotId}`);
    }
  }
  return { observations, slots };
}

function placementResult(definition, submitted) {
  const expected = definition.answer?.placements ?? {};
  const placements = submitted && typeof submitted === 'object' && submitted.placements && typeof submitted.placements === 'object'
    ? submitted.placements
    : {};
  const components = Object.entries(expected).map(([observationId, expectedSlotId]) => {
    const submittedSlotId = placements[observationId] ?? null;
    return { observationId, submittedSlotId, expectedSlotId, correct: submittedSlotId === expectedSlotId };
  });
  return {
    correct: components.length > 0 && components.every((item) => item.correct),
    normalizedAnswer: { placements: { ...placements } },
    correctAnswer: { placements: { ...expected } },
    details: { components },
  };
}

function validateFindErrorDefinition(definition) {
  const stations = definition.payload?.stations;
  const observations = definition.payload?.observations;
  const expectedStationId = definition.answer?.value;
  if (!Array.isArray(stations) || stations.length < 3 || !Array.isArray(observations) || definition.answer?.kind !== 'station_id') {
    throw new Error(`Некорректное задание findError: ${definition.id}`);
  }
  const stationIds = new Set(stations.map((station) => station?.id));
  if (stationIds.size !== stations.length || stationIds.has(undefined) || !stationIds.has(expectedStationId)) {
    throw new Error(`findError ${definition.id}: некорректный набор станций или эталон`);
  }
  for (const observation of observations) {
    if (!stationIds.has(observation?.stationId)) throw new Error(`findError ${definition.id}: неизвестная stationId ${observation?.stationId}`);
  }
  return { stations, observations };
}

export function createTaskInstance(definition, options) {
  if (!definition?.id || !options?.instanceId || !options?.contentPack) {
    throw new Error('Для формирования TaskInstance нужны definition.id, instanceId и contentPack');
  }
  const seed = Number(options.seed ?? 0);
  const publicTask = {
    instanceId: options.instanceId,
    definitionId: definition.id,
    contentPack: options.contentPack,
    type: definition.type,
    difficulty: definition.difficulty ?? 1,
    question: definition.question,
    response: responseDescriptor(definition),
  };

  if (definition.type === 'decode' || definition.type === 'numeric') {
    publicTask.payload = structuredClone(definition.payload ?? {});
    return { publicTask, validationContext: { kind: 'numeric' } };
  }

  if (definition.type === 'choice') {
    const optionsList = definition.payload?.options;
    if (!Array.isArray(optionsList) || definition.answer?.kind !== 'choice_index') throw new Error(`Некорректное задание choice: ${definition.id}`);
    const canonicalByPublic = shuffledIndices(optionsList.length, seed);
    publicTask.payload = { options: canonicalByPublic.map((canonicalIndex, publicIndex) => ({ id: publicIndex, label: optionsList[canonicalIndex] })) };
    return { publicTask, validationContext: { kind: 'choice', canonicalByPublic } };
  }

  if (definition.type === 'sequence') {
    if (!Array.isArray(definition.steps) || !Array.isArray(definition.correct_order)) throw new Error(`Некорректное задание sequence: ${definition.id}`);
    const canonicalByPublic = shuffledIndices(definition.steps.length, seed);
    publicTask.payload = { steps: canonicalByPublic.map((canonicalIndex, publicIndex) => ({ id: publicIndex, label: definition.steps[canonicalIndex] })) };
    return { publicTask, validationContext: { kind: 'sequence', canonicalByPublic } };
  }

  if (definition.type === 'stationPlot') {
    const { observations, slots } = validatePlacementDefinition(definition, 'station_plot', 'stationPlot');
    publicTask.payload = {
      profile: definition.payload?.profile ?? null,
      station: structuredClone(definition.payload?.station ?? null),
      observations: structuredClone(observations),
      slots: structuredClone(slots),
      canvas: structuredClone(definition.payload?.canvas ?? { width: 1000, height: 1000 }),
    };
    return { publicTask, validationContext: { kind: 'stationPlot' } };
  }

  if (definition.type === 'stationBoard') {
    const { observations, slots } = validatePlacementDefinition(definition, 'station_board', 'stationBoard');
    const stations = definition.payload?.stations;
    if (!Array.isArray(stations) || stations.length < 2) throw new Error(`stationBoard ${definition.id} требует несколько станций`);
    const stationIds = new Set(stations.map((item) => item?.id));
    if (stationIds.size !== stations.length || stationIds.has(undefined)) throw new Error(`stationBoard ${definition.id}: station.id должны быть уникальными`);
    for (const item of [...observations, ...slots]) {
      if (!stationIds.has(item?.stationId)) throw new Error(`stationBoard ${definition.id}: неизвестная stationId ${item?.stationId}`);
    }
    publicTask.payload = {
      profile: definition.payload?.profile ?? null,
      stations: structuredClone(stations),
      observations: structuredClone(observations),
      slots: structuredClone(slots),
      canvas: structuredClone(definition.payload?.canvas ?? { width: 1000, height: 1000 }),
    };
    return { publicTask, validationContext: { kind: 'stationBoard' } };
  }

  if (definition.type === 'findError') {
    const { stations, observations } = validateFindErrorDefinition(definition);
    publicTask.payload = {
      profile: definition.payload?.profile ?? null,
      rule: definition.payload?.rule ?? null,
      stations: structuredClone(stations),
      observations: structuredClone(observations),
      canvas: structuredClone(definition.payload?.canvas ?? { width: 1000, height: 1000 }),
    };
    return { publicTask, validationContext: { kind: 'findError' } };
  }

  throw new Error(`Тип задания ${definition.type} пока не поддерживается первым рабочим срезом`);
}

function numericResult(definition, submitted) {
  const raw = typeof submitted === 'object' && submitted !== null ? submitted.value : submitted;
  const value = Number(raw);
  const expected = Number(definition.answer?.value);
  const tolerance = Number(definition.answer?.tolerance ?? 0);
  const correct = Number.isFinite(value) && Number.isFinite(expected) && Math.abs(value - expected) <= tolerance;
  return { correct, normalizedAnswer: value, correctAnswer: expected };
}

export function validateTaskAnswer(definition, validationContext, submitted) {
  if (definition.type === 'decode' || definition.type === 'numeric') return numericResult(definition, submitted);

  if (definition.type === 'choice') {
    const publicIndex = Number(submitted?.choiceIndex);
    const canonicalIndex = validationContext?.canonicalByPublic?.[publicIndex];
    const expected = Number(definition.answer?.value);
    return {
      correct: Number.isInteger(publicIndex) && canonicalIndex === expected,
      normalizedAnswer: publicIndex,
      correctAnswer: definition.payload.options[expected],
    };
  }

  if (definition.type === 'sequence') {
    const order = Array.isArray(submitted?.order) ? submitted.order.map(Number) : [];
    const canonicalOrder = order.map((publicIndex) => validationContext?.canonicalByPublic?.[publicIndex]);
    const expected = definition.correct_order.map(Number);
    const correct = canonicalOrder.length === expected.length && canonicalOrder.every((value, index) => value === expected[index]);
    return { correct, normalizedAnswer: order, correctAnswer: expected.map((canonicalIndex) => definition.steps[canonicalIndex]) };
  }

  if (definition.type === 'stationPlot' || definition.type === 'stationBoard') return placementResult(definition, submitted);

  if (definition.type === 'findError') {
    const submittedStationId = typeof submitted?.stationId === 'string' ? submitted.stationId : '';
    const expectedStationId = String(definition.answer?.value ?? '');
    const station = definition.payload.stations.find((item) => item.id === expectedStationId);
    return {
      correct: submittedStationId === expectedStationId,
      normalizedAnswer: { stationId: submittedStationId },
      correctAnswer: station?.name ?? expectedStationId,
      details: { selectedStationId: submittedStationId, expectedStationId },
    };
  }

  throw new Error(`Проверка типа ${definition.type} пока не поддерживается`);
}

export function assertPublicTaskSafe(publicTask) {
  const forbidden = new Set([
    'answer', 'correct_order', 'correctOrder', 'canonicalByPublic', 'validationContext', 'correctPlacements',
    'correctStationId', 'expectedStationId',
  ]);
  const visit = (value) => {
    if (!value || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value)) {
      if (forbidden.has(key)) throw new Error(`Публичное задание раскрывает запрещённое поле ${key}`);
      visit(child);
    }
  };
  visit(publicTask);
  return true;
}
