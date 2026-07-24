import { describe, it, expect } from "vitest";
import { ordenarPorPrioridad, type ConPrioridad } from "./sourced-priority";

type Fila = ConPrioridad & { nombre: string };
const f = (nombre: string, over: Partial<ConPrioridad> = {}): Fila => ({
  nombre,
  interestCount: 0,
  status: "detected",
  contactPhone: "",
  contactEmail: "",
  ...over,
});

const orden = (filas: Fila[]) => ordenarPorPrioridad(filas).map((x) => x.nombre);

describe("ordenarPorPrioridad", () => {
  // El caso que motivó esto: 11 leads calientes enterrados entre 986 filas.
  it("pone primero los que tienen interés y no se contactaron", () => {
    expect(
      orden([f("frio"), f("caliente", { interestCount: 3 }), f("otro-frio")]),
    ).toEqual(["caliente", "frio", "otro-frio"]);
  });

  it("ordena por cantidad de interés", () => {
    expect(
      orden([f("uno", { interestCount: 1 }), f("tres", { interestCount: 3 }), f("dos", { interestCount: 2 })]),
    ).toEqual(["tres", "dos", "uno"]);
  });

  it("los ya contactados no vuelven a encabezar la lista", () => {
    expect(
      orden([
        f("contactado", { interestCount: 9, status: "contacted" }),
        f("nuevo", { interestCount: 1 }),
      ]),
    ).toEqual(["nuevo", "contactado"]);
  });

  it("manda al fondo los dados de baja y los ya reclamados", () => {
    expect(
      orden([
        f("baja", { interestCount: 5, status: "opted_out" }),
        f("reclamado", { interestCount: 5, status: "claimed" }),
        f("activo", { interestCount: 1 }),
      ]),
    ).toEqual(["activo", "reclamado", "baja"]);
  });

  // Sin teléfono ni email no hay nada que hacer con esa fila: en los datos
  // reales solo 19 de 500 tenían email.
  it("con el mismo interés, adelante el que se puede contactar", () => {
    expect(
      orden([
        f("sin-datos", { interestCount: 2 }),
        f("con-tel", { interestCount: 2, contactPhone: "351..." }),
      ]),
    ).toEqual(["con-tel", "sin-datos"]);
  });

  it("no muta el array original", () => {
    const filas = [f("a"), f("b", { interestCount: 5 })];
    ordenarPorPrioridad(filas);
    expect(filas[0].nombre).toBe("a");
  });

  it("no rompe con lista vacía", () => {
    expect(ordenarPorPrioridad([])).toEqual([]);
  });
});
