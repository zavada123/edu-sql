const task = (t) => ({
    ordered: false,
    mustUse: [],
    ...t
});
/**
 * Grade 9, chapter 6 «Бази даних» (§6.1 database, table, record, field, key; §6.2 sorting, filters, queries).
 * The textbook works in LibreOffice Base; a Base query can also be written in SQL mode, and these are such queries.
 */
const library9 = {
    id: "library-grade9",
    title: "Бібліотека: таблиці, сортування, фільтри",
    database: "library",
    source: "Інформатика 9 кл., розділ 6 «Бази даних», §6.1–6.2",
    intro: "Облік шкільної бібліотеки вже в базі: таблиці `books`, `authors`, `readers` і `loans`. У LibreOffice Base запит можна скласти помічником або написати мовою SQL. Тут ти пишеш його сам: напиши запит, виконай його і натисни **Перевірити**.",
    tasks: [
        task({
            id: "all-records",
            title: "Усі записи таблиці",
            task: "Покажи всі записи таблиці `books`: кожен рядок і кожне поле.",
            solution: "SELECT * FROM books",
            hints: ["Зірочка `*` означає «усі поля».", "`SELECT * FROM books;`"]
        }),
        task({
            id: "fields",
            title: "Лише потрібні поля",
            task: "Покажи для кожної книжки лише два поля: назву (`title`) і рік (`year`).",
            solution: "SELECT title, year FROM books",
            hints: ["Після `SELECT` перелічи поля через кому.", "`SELECT title, year FROM books;`"]
        }),
        task({
            id: "by-key",
            title: "Запис за ключем",
            task: "Ключ таблиці `books` — поле `id`: у кожної книжки він свій. Покажи назву книжки, в якої `id` дорівнює 6.",
            solution: "SELECT title FROM books WHERE id = 6",
            mustUse: ["WHERE"],
            hints: ["Відбір рядків робить `WHERE` з умовою.", "`SELECT title FROM books WHERE id = 6;`"]
        }),
        task({
            id: "sort-one",
            title: "Сортування за одним полем",
            task: "Покажи назву і рік усіх книжок від найновішої до найстарішої.",
            solution: "SELECT title, year FROM books ORDER BY year DESC",
            ordered: true,
            mustUse: ["ORDER BY"],
            hints: ["Упорядковує рядки `ORDER BY поле`. За спаданням — `DESC`.", "`SELECT title, year FROM books ORDER BY year DESC;`"]
        }),
        task({
            id: "sort-many",
            title: "Сортування за кількома полями",
            task: "Покажи жанр, назву і рік книжок. Упорядкуй за жанром за абеткою, а книжки одного жанру — від найстарішої.",
            solution: "SELECT genre, title, year FROM books ORDER BY genre, year",
            ordered: true,
            mustUse: ["ORDER BY"],
            hints: [
                "Після `ORDER BY` можна написати кілька полів через кому: спершу головне, потім друге.",
                "`SELECT genre, title, year FROM books ORDER BY genre, year;`"
            ]
        }),
        task({
            id: "filter-text",
            title: "Фільтр за значенням",
            task: "Покажи назви всіх книжок жанру «пригоди».",
            solution: "SELECT title FROM books WHERE genre = 'пригоди'",
            mustUse: ["WHERE"],
            hints: ["Текст в умові пишуть в одинарних лапках: `'пригоди'`.", "`SELECT title FROM books WHERE genre = 'пригоди';`"]
        }),
        task({
            id: "filter-compare",
            title: "Фільтр з порівнянням",
            task: "Покажи назву і рік книжок, написаних до 1900 року, від найстарішої.",
            solution: "SELECT title, year FROM books WHERE year < 1900 ORDER BY year",
            ordered: true,
            mustUse: ["WHERE", "ORDER BY"],
            hints: ["Для чисел є знаки `<`, `>`, `<=`, `>=`. `WHERE` пишуть перед `ORDER BY`.", "`SELECT title, year FROM books WHERE year < 1900 ORDER BY year;`"]
        }),
        task({
            id: "filter-and",
            title: "Дві умови разом",
            task: "Покажи назву і кількість примірників (`copies`) пригодницьких книжок, яких у бібліотеці більше одного примірника.",
            solution: "SELECT title, copies FROM books WHERE genre = 'пригоди' AND copies > 1",
            mustUse: ["WHERE", "AND"],
            hints: ["Дві умови, які мають виконуватися разом, з'єднує `AND`.", "`SELECT title, copies FROM books WHERE genre = 'пригоди' AND copies > 1;`"]
        }),
        task({
            id: "filter-like",
            title: "Пошук за початком слова",
            task: "Покажи імена читачів (таблиця `readers`), які починаються на літеру «О».",
            solution: "SELECT name FROM readers WHERE name LIKE 'О%'",
            mustUse: ["LIKE"],
            hints: ["`LIKE` порівнює з візерунком: `%` означає «будь-які символи далі».", "`SELECT name FROM readers WHERE name LIKE 'О%';`"]
        }),
        task({
            id: "lesya",
            title: "Книжки Лесі Українки",
            task: "Мирославі для проєкту потрібні всі книжки Лесі Українки. У таблиці `books` є лише номер автора `author_id`. Покажи назви її книжок.",
            solution: "SELECT title FROM books WHERE author_id = 2",
            mustUse: ["WHERE"],
            hints: [
                "Спершу знайди номер (`id`) Лесі Українки в таблиці `authors`.",
                "Її `id` дорівнює 2: `SELECT title FROM books WHERE author_id = 2;`"
            ]
        }),
        task({
            id: "taras",
            title: "Запит для Тараса",
            task: "Тарасові потрібен список пригодницьких книжок від найновішої: назва і рік.",
            solution: "SELECT title, year FROM books WHERE genre = 'пригоди' ORDER BY year DESC",
            ordered: true,
            mustUse: ["WHERE", "ORDER BY"],
            hints: ["Тут і фільтр, і сортування: спершу `WHERE`, потім `ORDER BY ... DESC`.", "`SELECT title, year FROM books WHERE genre = 'пригоди' ORDER BY year DESC;`"]
        })
    ]
};
export const practiceSets = [library9];
/** The practice set of a template, if there is one. */
export const practiceFor = (database) => practiceSets.find((s) => s.database === database);
