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
  if (definition.answer?.kind === 'numeric') {
    return { kind: 'numeric', unit: definition.answer.unit ?? null };
  }
  if (definition.answer?.kind === 'choice_index') return { kind: 'choice' };
  if (definition.type === 'sequence') return { kind: 'sequence' };
  return { kind: definition.type };
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
    if (!Array.isArray(optionsList) || definition.answer?.kind !== 'choice_index') {
      throw new Error(`Некорректное задание choice: ${definition.id}`);
    }
    const canonicalByPublic = shuffledIndices(optionsList.length, seed);
    publicTask.payload = {
      options: canonicalByPublic.map((canonicalIndex, publicIndex) => ({ id: publicIndex, label: optionsList[canonicalIndex] })),
    };
    return { publicTask, validationContext: { kind: 'choice', canonicalByPublic } };
  }

  if (definition.type === 'sequence') {
    if (!Array.isArray(definition.steps) || !Array.isArray(definition.correct_order)) {
      throw new Error(`Некорректное задание sequence: ${definition.id}`);
    }
    const canonicalByPublic = shuffledIndices(definition.steps.length, seed);
    publicTask.payload = {
      steps: canonicalByPublic.map((canonicalIndex, publicIndex) => ({ id: publicIndex, label: definition.steps[canonicalIndex] })),
    };
    return { publicTask, validationContext: { kind: 'sequence', canonicalByPublic } };
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
  if (definition.type === 'decode' || definition.type === 'numeric') {
    return numericResult(definition, submitted);
  }

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
    return {
      correct,
      normalizedAnswer: order,
      correctAnswer: expected.map((canonicalIndex) => definition.steps[canonicalIndex]),
    };
  }

  throw new Error(`Проверка типа ${definition.type} пока не поддерживается`);
}

export function assertPublicTaskSafe(publicTask) {
  const forbidden = new Set(['answer', 'correct_order', 'correctOrder', 'canonicalByPublic', 'validationContext']);
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
