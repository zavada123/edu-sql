import { cases } from "../core/cases/index.ts"

/** A ready database to start from. */
export interface Template {
  readonly id: string
  readonly title: string
  readonly note: string
  readonly icon: string
  /** SQL that creates the database. */
  readonly setup: string
  /** Text that the editor gets with the new database. */
  readonly starter: string
}

const library: Template = {
  id: "library",
  title: "Бібліотека",
  icon: "📚",
  note: "Книги, читачі й видачі. Хто що читає і хто не повернув книгу вчасно.",
  setup: `
CREATE TABLE authors (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  country TEXT
);
CREATE TABLE books (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  author_id INTEGER REFERENCES authors(id),
  year INTEGER,
  genre TEXT,
  copies INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE readers (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  class TEXT
);
CREATE TABLE loans (
  id INTEGER PRIMARY KEY,
  book_id INTEGER NOT NULL REFERENCES books(id),
  reader_id INTEGER NOT NULL REFERENCES readers(id),
  taken TEXT NOT NULL,
  returned TEXT
);
INSERT INTO authors VALUES
  (1, 'Іван Франко', 'Україна'), (2, 'Леся Українка', 'Україна'), (3, 'Всеволод Нестайко', 'Україна'),
  (4, 'Астрід Ліндґрен', 'Швеція'), (5, 'Джоан Роулінг', 'Велика Британія'), (6, 'Жуль Верн', 'Франція');
INSERT INTO books VALUES
  (1, 'Захар Беркут', 1, 1883, 'повість', 3), (2, 'Лис Микита', 1, 1890, 'казка', 4),
  (3, 'Лісова пісня', 2, 1911, 'драма', 2), (4, 'Тореадори з Васюківки', 3, 1973, 'пригоди', 5),
  (5, 'Пеппі Довгапанчоха', 4, 1945, 'пригоди', 2), (6, 'Гаррі Поттер і філософський камінь', 5, 1997, 'фентезі', 6),
  (7, 'Двадцять тисяч льє під водою', 6, 1870, 'пригоди', 2), (8, 'Таємниця трьох невідомих', 3, 1970, 'пригоди', 1);
INSERT INTO readers VALUES
  (1, 'Олена Коваль', '5-А'), (2, 'Максим Бондар', '5-А'), (3, 'Софія Мельник', '6-Б'),
  (4, 'Артем Шевчук', '6-Б'), (5, 'Дарина Ткач', '7-А');
INSERT INTO loans VALUES
  (1, 4, 1, '2026-09-02', '2026-09-16'), (2, 6, 1, '2026-09-17', NULL), (3, 2, 2, '2026-09-05', '2026-09-12'),
  (4, 6, 3, '2026-09-08', '2026-09-30'), (5, 3, 3, '2026-10-01', NULL), (6, 5, 4, '2026-09-10', NULL),
  (7, 7, 5, '2026-09-12', '2026-10-02'), (8, 1, 5, '2026-10-03', NULL), (9, 4, 2, '2026-10-05', NULL);
`,
  starter: `-- Які книги зараз на руках (ще не повернули)?
SELECT readers.name, books.title, loans.taken
FROM loans
JOIN readers ON readers.id = loans.reader_id
JOIN books ON books.id = loans.book_id
WHERE loans.returned IS NULL
ORDER BY loans.taken;
`
}

const shop: Template = {
  id: "shop",
  title: "Магазин",
  icon: "🛒",
  note: "Товари, покупці й замовлення. Рахуй виручку, шукай найпопулярніше.",
  setup: `
CREATE TABLE products (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price REAL NOT NULL CHECK (price >= 0),
  stock INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE customers (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT
);
CREATE TABLE orders (
  id INTEGER PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  date TEXT NOT NULL
);
CREATE TABLE order_items (
  order_id INTEGER NOT NULL REFERENCES orders(id),
  product_id INTEGER NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  PRIMARY KEY (order_id, product_id)
);
INSERT INTO products VALUES
  (1, 'Зошит у клітинку', 'канцелярія', 18.5, 120), (2, 'Ручка синя', 'канцелярія', 12, 300),
  (3, 'Рюкзак', 'сумки', 950, 8), (4, 'Пенал', 'сумки', 210, 25), (5, 'Фарби акварельні', 'творчість', 145, 30),
  (6, 'Пластилін', 'творчість', 89.9, 40), (7, 'Калькулятор', 'техніка', 320, 12), (8, 'Навушники', 'техніка', 499, 0);
INSERT INTO customers VALUES
  (1, 'Ірина', 'Київ'), (2, 'Богдан', 'Львів'), (3, 'Катерина', 'Харків'), (4, 'Назар', 'Київ'), (5, 'Ольга', 'Одеса');
INSERT INTO orders VALUES
  (1, 1, '2026-08-20'), (2, 2, '2026-08-21'), (3, 1, '2026-08-28'), (4, 3, '2026-09-01'),
  (5, 4, '2026-09-01'), (6, 2, '2026-09-03'), (7, 5, '2026-09-05');
INSERT INTO order_items VALUES
  (1, 1, 10), (1, 2, 5), (2, 3, 1), (2, 4, 1), (3, 5, 2), (3, 6, 3), (4, 1, 6), (4, 7, 1),
  (5, 2, 10), (5, 4, 2), (6, 8, 1), (7, 1, 4), (7, 5, 1), (7, 6, 2);
`,
  starter: `-- Скільки грошей приніс кожен товар?
SELECT products.name, SUM(order_items.quantity * products.price) AS revenue
FROM order_items
JOIN products ON products.id = order_items.product_id
GROUP BY products.id
ORDER BY revenue DESC;
`
}

const school: Template = {
  id: "school",
  title: "Школа: класи й оцінки",
  icon: "🏫",
  note: "Класи, учні, предмети й оцінки. Середній бал, найкращі учні, порівняння класів.",
  setup: `
CREATE TABLE classes (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  teacher TEXT
);
CREATE TABLE students (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  class_id INTEGER NOT NULL REFERENCES classes(id),
  birthday TEXT
);
CREATE TABLE subjects (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);
CREATE TABLE grades (
  id INTEGER PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES students(id),
  subject_id INTEGER NOT NULL REFERENCES subjects(id),
  grade INTEGER NOT NULL CHECK (grade BETWEEN 1 AND 12),
  date TEXT NOT NULL
);
INSERT INTO classes VALUES (1, '6-А', 'Наталія Петрівна'), (2, '6-Б', 'Олег Іванович');
INSERT INTO students VALUES
  (1, 'Андрій Гнатюк', 1, '2014-03-12'), (2, 'Вікторія Кравець', 1, '2014-07-30'), (3, 'Денис Олійник', 1, '2013-11-05'),
  (4, 'Злата Савчук', 1, '2014-01-19'), (5, 'Ілля Романенко', 2, '2014-05-02'), (6, 'Марія Лисенко', 2, '2014-09-14'),
  (7, 'Остап Паламарчук', 2, '2013-12-25'), (8, 'Юлія Марченко', 2, '2014-04-08');
INSERT INTO subjects VALUES (1, 'Інформатика'), (2, 'Математика'), (3, 'Українська мова'), (4, 'Природознавство');
INSERT INTO grades (student_id, subject_id, grade, date) VALUES
  (1, 1, 11, '2026-09-10'), (1, 2, 8, '2026-09-11'), (1, 3, 9, '2026-09-12'), (1, 4, 10, '2026-09-15'),
  (2, 1, 12, '2026-09-10'), (2, 2, 11, '2026-09-11'), (2, 3, 12, '2026-09-12'), (2, 4, 11, '2026-09-15'),
  (3, 1, 7, '2026-09-10'), (3, 2, 6, '2026-09-11'), (3, 3, 8, '2026-09-12'), (3, 4, 7, '2026-09-15'),
  (4, 1, 10, '2026-09-10'), (4, 2, 9, '2026-09-11'), (4, 3, 10, '2026-09-12'),
  (5, 1, 9, '2026-09-10'), (5, 2, 10, '2026-09-11'), (5, 3, 7, '2026-09-12'), (5, 4, 8, '2026-09-15'),
  (6, 1, 12, '2026-09-10'), (6, 2, 12, '2026-09-11'), (6, 3, 11, '2026-09-12'), (6, 4, 12, '2026-09-15'),
  (7, 1, 6, '2026-09-10'), (7, 2, 5, '2026-09-11'), (7, 4, 6, '2026-09-15'),
  (8, 1, 10, '2026-09-10'), (8, 2, 9, '2026-09-11'), (8, 3, 10, '2026-09-12'), (8, 4, 9, '2026-09-15');
`,
  starter: `-- Середній бал кожного учня
SELECT students.name, classes.name AS class, ROUND(AVG(grades.grade), 1) AS average
FROM grades
JOIN students ON students.id = grades.student_id
JOIN classes ON classes.id = students.class_id
GROUP BY students.id
ORDER BY average DESC;
`
}

const empty: Template = {
  id: "empty",
  title: "Порожня база",
  icon: "✨",
  note: "Жодної таблиці: створи свою командою CREATE TABLE.",
  setup: "",
  starter: `-- Створи таблицю, додай рядки й подивись, що вийшло
CREATE TABLE friends (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  age INTEGER
);

INSERT INTO friends (name, age) VALUES ('Оля', 11), ('Тарас', 12);

SELECT * FROM friends;
`
}

/** Databases of the detective cases, for free queries without tasks. */
const caseTemplates: Template[] = cases.map((c) => ({
  id: `case-${c.id}`,
  title: `База справи «${c.title}»`,
  icon: "🕵️",
  note: `Таблиці зі справи SQL-детектива (${c.grades} класи) для вільних запитів.`,
  setup: c.setup,
  starter: `SELECT * FROM ${c.tables[0]?.name ?? "sqlite_master"} LIMIT 20;\n`
}))

/** The empty database first, then the school templates and the case databases. */
export const templates: readonly Template[] = [empty, library, shop, school, ...caseTemplates]

export const templateById = (id: string): Template | undefined => templates.find((t) => t.id === id)
