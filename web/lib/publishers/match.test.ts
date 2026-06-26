import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normName,
  tokenSortRatio,
  agesCompatible,
  isSamePerson,
  FUZZY_THRESHOLD,
  AGE_TOLERANCE,
} from "./match.ts";

test("normName quita acentos, mayúsculas y espacios extra", () => {
  assert.equal(normName("  José   Gómez  "), "JOSE GOMEZ");
  assert.equal(normName("María Ángeles"), "MARIA ANGELES");
  assert.equal(normName("Ñoño"), "NONO");
});

test("tokenSortRatio es insensible al orden de los tokens", () => {
  assert.equal(tokenSortRatio("JOSE GOMEZ", "GOMEZ JOSE"), 100);
  assert.equal(tokenSortRatio("JUAN PEREZ", "JUAN PEREZ"), 100);
});

test("tokenSortRatio: cadenas vacías", () => {
  assert.equal(tokenSortRatio("", ""), 100);
  assert.equal(tokenSortRatio("JOSE", ""), 0);
});

test("agesCompatible respeta AGE_TOLERANCE y nulos", () => {
  assert.equal(agesCompatible(30, 30), true);
  assert.equal(agesCompatible(30, 30 + AGE_TOLERANCE), true);
  assert.equal(agesCompatible(30, 30 + AGE_TOLERANCE + 1), false);
  assert.equal(agesCompatible(null, 99), true);
  assert.equal(agesCompatible(30, null), true);
});

test("isSamePerson: mismo nombre con acentos y orden distinto, edad compatible", () => {
  assert.equal(isSamePerson("José Gómez", 30, "GOMEZ JOSE", 31), true);
});

test("isSamePerson: mismo nombre pero edad fuera de tolerancia → distinta persona", () => {
  assert.equal(isSamePerson("José Gómez", 30, "José Gómez", 40), false);
});

test("isSamePerson: nombres claramente distintos → no match", () => {
  assert.equal(isSamePerson("Juan Pérez", 30, "María Rodríguez", 30), false);
});

test("isSamePerson: typo menor por encima del umbral, sin edad", () => {
  // 'JON' vs 'JOHN' + apellido idéntico debería superar 88
  assert.equal(isSamePerson("John Smith", null, "Jon Smith", null), true);
});

test("isSamePerson: nombre vacío nunca matchea", () => {
  assert.equal(isSamePerson("", 30, "Juan Perez", 30), false);
  assert.equal(isSamePerson("Juan Perez", 30, "", 30), false);
});

test("el umbral declarado se respeta", () => {
  // Caso justo por debajo del umbral: apellido distinto
  const ratio = tokenSortRatio(normName("Carlos Ruiz"), normName("Carlos Diaz"));
  assert.ok(ratio < FUZZY_THRESHOLD, `esperaba < ${FUZZY_THRESHOLD}, fue ${ratio}`);
});
