const quote = (s) => `«${s ?? ""}»`;
const RULES = [
    {
        pattern: /no such table: (?:main\.)?(\S+)/,
        message: (m) => `Таблиці ${quote(m[1])} немає. Подивись назви у вкладці «Таблиці бази»: можливо, там інша літера або назва англійською.`
    },
    {
        pattern: /no such column: (\S+)/,
        message: (m) => `Стовпця ${quote(m[1])} немає. Перевір назву у вкладці «Таблиці бази». Якщо це текст, а не назва стовпця, візьми його в одинарні лапки: \`'${m[1] ?? ""}'\`.`
    },
    {
        pattern: /ambiguous column name: (\S+)/,
        message: (m) => `Стовпець ${quote(m[1])} є в кількох таблицях. Напиши, з якої саме: наприклад, \`people.${m[1] ?? ""}\` або \`p.${m[1] ?? ""}\`.`
    },
    {
        pattern: /near "([^"]*)": syntax error/,
        message: (m) => `Помилка в записі запиту біля ${quote(m[1])}. Перевір коми, лапки й порядок слів: \`SELECT … FROM … WHERE … ORDER BY …\``
    },
    {
        pattern: /incomplete input/,
        message: () => "Запит обірвався. Можливо, не закрито лапку `'` чи дужку `(` або запит закінчується на `AND`, `OR` чи кому."
    },
    {
        pattern: /unrecognized token: "([^"]*)"/,
        message: (m) => `Незрозумілий знак ${quote(m[1])}. Текст бери в одинарні лапки \`'…'\`, а не в «…» чи "…".`
    },
    {
        pattern: /misuse of aggregate(?: function)?:? ?(\S*)/,
        message: () => "`COUNT`, `SUM`, `AVG`, `MIN` і `MAX` не можна писати у `WHERE`. Для умови на результат групи використовуй `HAVING` після `GROUP BY`."
    },
    {
        pattern: /a GROUP BY clause is required before HAVING/,
        message: () => "`HAVING` працює лише разом із `GROUP BY`: спочатку згрупуй рядки, потім додай умову."
    },
    {
        pattern: /no such function: (\S+)/,
        message: (m) => `Функції ${quote(m[1])} немає в SQLite. Перевір назву: \`COUNT\`, \`SUM\`, \`AVG\`, \`MIN\`, \`MAX\`, \`LOWER\`, \`UPPER\`, \`LENGTH\`.`
    },
    {
        pattern: /wrong number of arguments to function (\S+)/,
        message: (m) => `У функції ${quote(m[1])} неправильна кількість значень у дужках.`
    },
    {
        pattern: /SELECTs to the left and right of (\S+) do not have the same number of result columns/,
        message: (m) => `У частин запиту з \`${m[1] ?? "UNION"}\` різна кількість стовпців.`
    },
    {
        pattern: /UNIQUE constraint failed: (\S+)/,
        message: (m) => `Значення в ${quote(m[1])} мають бути різними, а такий рядок уже є. Зміни значення або онови наявний рядок через \`UPDATE\`.`
    },
    {
        pattern: /NOT NULL constraint failed: (\S+)/,
        message: (m) => `Стовпець ${quote(m[1])} не може бути порожнім (\`NOT NULL\`). Додай для нього значення.`
    },
    {
        pattern: /FOREIGN KEY constraint failed/,
        message: () => "Зовнішній ключ не дозволив зміну: рядок посилається на запис, якого немає в іншій таблиці, або на цей рядок посилаються інші. Спочатку додай (або видали) пов'язаний запис."
    },
    {
        pattern: /CHECK constraint failed: (\S+)/,
        message: (m) => `Значення не пройшло перевірку \`CHECK\` ${quote(m[1])}. Подивись умову в описі таблиці.`
    },
    {
        pattern: /(?:table|view|index|trigger) (\S+) already exists/,
        message: (m) => `${quote(m[1])} уже є в базі. Обери іншу назву, видали старе через \`DROP\` або напиши \`CREATE TABLE IF NOT EXISTS\`.`
    },
    {
        pattern: /table (\S+) has (\d+) columns but (\d+) values were supplied/,
        message: (m) => `У таблиці ${quote(m[1])} ${m[2] ?? ""} стовпців, а значень у \`VALUES\` ${m[3] ?? ""}. Перелічи стовпці після назви таблиці або додай значення.`
    },
    {
        pattern: /(\d+) values for (\d+) columns/,
        message: (m) => `Значень ${m[1] ?? ""}, а стовпців ${m[2] ?? ""}. Кількість має збігатися.`
    },
    {
        pattern: /datatype mismatch/,
        message: () => "Тип значення не підходить: у стовпець `INTEGER PRIMARY KEY` можна записати лише ціле число."
    },
    {
        pattern: /cannot start a transaction within a transaction/,
        message: () => "Транзакцію вже розпочато. Заверши її командою `COMMIT` або `ROLLBACK`, перш ніж писати `BEGIN` знову."
    },
    {
        pattern: /cannot (?:commit|rollback) - no transaction is active/,
        message: () => "Немає розпочатої транзакції: `COMMIT` і `ROLLBACK` пишуть після `BEGIN`."
    },
    {
        pattern: /duplicate column name: (\S+)/,
        message: (m) => `Стовпець ${quote(m[1])} указано двічі. Назви стовпців у таблиці мають бути різними.`
    },
    {
        pattern: /ORDER BY term out of range/,
        message: () => "У `ORDER BY` номер стовпця більший, ніж стовпців у результаті."
    }
];
/** Explains an SQLite error message in Ukrainian. Unknown errors keep the original text after a general phrase. */
export const explainError = (raw) => {
    for (const rule of RULES) {
        const m = raw.match(rule.pattern);
        if (m)
            return rule.message(m);
    }
    return `SQLite не зміг виконати запит: ${raw}`;
};
