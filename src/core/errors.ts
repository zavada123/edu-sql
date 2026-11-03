/** A rule that turns an SQLite error into a message for children. */
interface Rule {
  readonly pattern: RegExp
  readonly message: (m: RegExpMatchArray) => string
}

const quote = (s: string | undefined): string => `«${s ?? ""}»`

const RULES: readonly Rule[] = [
  {
    pattern: /no such table: (?:main\.)?(\S+)/,
    message: (m) => `Таблиці ${quote(m[1])} немає. Подивись назви таблиць у схемі праворуч: можливо, там інша літера або назва англійською.`
  },
  {
    pattern: /no such column: (\S+)/,
    message: (m) =>
      `Стовпця ${quote(m[1])} немає. Перевір назву в схемі. Якщо це текст, а не назва стовпця, візьми його в одинарні лапки: '${m[1] ?? ""}'.`
  },
  {
    pattern: /ambiguous column name: (\S+)/,
    message: (m) => `Стовпець ${quote(m[1])} є в кількох таблицях. Напиши, з якої саме: наприклад, people.${m[1] ?? ""} або p.${m[1] ?? ""}.`
  },
  {
    pattern: /near "([^"]*)": syntax error/,
    message: (m) => `Помилка в записі запиту біля ${quote(m[1])}. Перевір коми, лапки й порядок слів: SELECT … FROM … WHERE … ORDER BY …`
  },
  {
    pattern: /incomplete input/,
    message: () => "Запит обірвався. Можливо, не закрито лапку ' чи дужку ( або запит закінчується на AND, OR, кому."
  },
  {
    pattern: /unrecognized token: "([^"]*)"/,
    message: (m) => `Незрозумілий знак ${quote(m[1])}. Текст бери в одинарні лапки '…', а не в «…» чи "…".`
  },
  {
    pattern: /misuse of aggregate(?: function)?:? ?(\S*)/,
    message: () => "COUNT, SUM, AVG, MIN і MAX не можна писати у WHERE. Для умови на результат групи використовуй HAVING після GROUP BY."
  },
  {
    pattern: /a GROUP BY clause is required before HAVING/,
    message: () => "HAVING працює лише разом із GROUP BY: спочатку згрупуй рядки, потім додай умову."
  },
  {
    pattern: /no such function: (\S+)/,
    message: (m) => `Функції ${quote(m[1])} немає в SQLite. Перевір назву: COUNT, SUM, AVG, MIN, MAX, LOWER, UPPER, LENGTH.`
  },
  {
    pattern: /wrong number of arguments to function (\S+)/,
    message: (m) => `У функції ${quote(m[1])} неправильна кількість значень у дужках.`
  },
  {
    pattern: /SELECTs to the left and right of (\S+) do not have the same number of result columns/,
    message: (m) => `У частин запиту з ${m[1] ?? "UNION"} різна кількість стовпців.`
  },
  {
    pattern: /ORDER BY term out of range/,
    message: () => "У ORDER BY номер стовпця більший, ніж стовпців у результаті."
  }
]

/** Explains an SQLite error message in Ukrainian. Unknown errors keep the original text after a general phrase. */
export const explainError = (raw: string): string => {
  for (const rule of RULES) {
    const m = raw.match(rule.pattern)
    if (m) return rule.message(m)
  }
  return `SQLite не зміг виконати запит: ${raw}`
}
