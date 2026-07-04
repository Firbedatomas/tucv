"use client";

import {
  SCREENING_QUESTION_TYPE,
  SCREENING_WEIGHT,
  MAX_SCREENING_QUESTIONS,
  type ScreeningQuestion,
} from "@/lib/constants";
import { inputClass, inputStyle } from "@/components/ui/Field";

export function ScreeningQuestionsEditor({
  questions,
  onChange,
}: {
  questions: ScreeningQuestion[];
  onChange: (next: ScreeningQuestion[]) => void;
}) {
  function addQuestion() {
    if (questions.length >= MAX_SCREENING_QUESTIONS) return;
    onChange([
      ...questions,
      {
        id: typeof crypto !== "undefined" ? crypto.randomUUID() : String(questions.length),
        question: "",
        type: "si_no",
        weight: "medio",
      },
    ]);
  }

  function updateQuestion(id: string, patch: Partial<ScreeningQuestion>) {
    onChange(questions.map((q) => (q.id === id ? { ...q, ...patch } : q)));
  }

  function removeQuestion(id: string) {
    onChange(questions.filter((q) => q.id !== id));
  }

  return (
    <div className="space-y-3">
      {questions.map((q, i) => (
        <div
          key={q.id}
          className="rounded-[var(--tucv-radius)] p-3"
          style={{ backgroundColor: "var(--tucv-bg)", border: "2px solid var(--tucv-border)" }}
        >
          <div className="flex items-start gap-2 mb-2">
            <input
              className={inputClass}
              style={{ ...inputStyle, flex: 1 }}
              value={q.question}
              onChange={(e) => updateQuestion(q.id, { question: e.target.value })}
              placeholder={`Pregunta ${i + 1}, ej: ¿Podés trabajar fines de semana?`}
            />
            <button
              type="button"
              onClick={() => removeQuestion(q.id)}
              className="text-xs font-semibold px-2 py-2.5 shrink-0"
              style={{ color: "var(--tucv-muted)" }}
              aria-label="Quitar pregunta"
            >
              Quitar
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              className={inputClass}
              style={{ ...inputStyle, width: "auto" }}
              value={q.type}
              onChange={(e) => updateQuestion(q.id, { type: e.target.value as ScreeningQuestion["type"] })}
            >
              {SCREENING_QUESTION_TYPE.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {q.type === "si_no" && (
              <select
                className={inputClass}
                style={{ ...inputStyle, width: "auto" }}
                value={q.weight}
                onChange={(e) => updateQuestion(q.id, { weight: e.target.value as ScreeningQuestion["weight"] })}
              >
                {SCREENING_WEIGHT.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      ))}

      {questions.length < MAX_SCREENING_QUESTIONS && (
        <button
          type="button"
          onClick={addQuestion}
          className="text-sm font-semibold px-3 py-2 rounded-[var(--tucv-radius)] border-2 w-full"
          style={{ borderColor: "var(--tucv-border)", color: "var(--tucv-text)", borderStyle: "dashed" }}
        >
          + Agregar pregunta {questions.length > 0 && `(${questions.length}/${MAX_SCREENING_QUESTIONS})`}
        </button>
      )}
    </div>
  );
}
