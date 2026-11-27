import type { BuildStep, Case, LessonStep, Trial } from "../types.ts"

/**
 * Case 3, «Справа про загублені лапи»: the student builds the database of an animal shelter with
 * `CREATE TABLE`, `INSERT`, keys and rules, one idea per step. At the end the rules of the student's tables
 * refuse forged adoption requests, and the phone number in them shows who sent them.
 */

/** The wet paper journal of the shelter. Lines 4, 7, 8 and 12 break the rules of chapter 5. */
const setup = `
CREATE TABLE old_journal (
  line INTEGER PRIMARY KEY,
  name TEXT,
  species TEXT,
  age INTEGER,
  weight REAL,
  chip TEXT
);
INSERT INTO old_journal VALUES
  (1, 'Бублик', 'кіт', 2, 4.1, 'UA-1001'),
  (2, 'Рекс', 'пес', 5, 23.5, 'UA-1002'),
  (3, 'Хмаринка', 'кролик', 1, 1.8, NULL),
  (4, NULL, 'кіт', 3, 3.9, 'UA-1004'),
  (5, 'Луна', 'пес', NULL, 3.2, 'UA-1005'),
  (6, 'Сонько', 'пес', NULL, 2.9, 'UA-1006'),
  (7, 'Шарик', 'пес', -4, 15.0, 'UA-1007'),
  (8, 'Кеша', 'папуга', 2, 0.1, NULL),
  (9, 'Мурка', 'кіт', 7, 4.5, 'UA-1009'),
  (10, 'Тайсон', 'пес', 3, 31.0, 'UA-1010'),
  (11, 'Пухнастик', 'кролик', 2, 2.2, 'UA-1011'),
  (12, 'Рижик', 'кіт', -1, 3.3, 'UA-1012'),
  (13, 'Грім', 'пес', 4, 27.4, 'UA-1013'),
  (14, 'Зефірка', 'кіт', 1, 2.8, 'UA-1014'),
  (15, 'Ведмідь', 'пес', 8, 35.2, 'UA-1015'),
  (16, 'Сніжок', 'кролик', 3, 2.0, NULL);
`

/** A build step: most steps check one table and its columns. */
const build = (
  s: Omit<BuildStep, "kind" | "after" | "data" | "trials" | "mustUse"> & Partial<Pick<BuildStep, "after" | "data" | "trials" | "mustUse">>
): BuildStep => ({
  kind: "build",
  after: "",
  data: [],
  trials: [],
  mustUse: [],
  ...s
})

/** A lesson: the example runs on the database of the lesson. */
const lesson = (s: Omit<LessonStep, "kind">): LessonStep => ({ kind: "lesson", ...s })

const PETS_V1 = "CREATE TABLE pets (\n  id INTEGER,\n  name TEXT,\n  species TEXT,\n  age INTEGER,\n  weight REAL\n)"
const PETS_KEY = "CREATE TABLE pets (\n  id INTEGER PRIMARY KEY,\n  name TEXT,\n  species TEXT,\n  age INTEGER,\n  weight REAL\n)"
const PETS_NAME = "CREATE TABLE pets (\n  id INTEGER PRIMARY KEY,\n  name TEXT NOT NULL,\n  species TEXT,\n  age INTEGER,\n  weight REAL\n)"
const PETS_STATUS =
  "CREATE TABLE pets (\n  id INTEGER PRIMARY KEY,\n  name TEXT NOT NULL,\n  species TEXT,\n  age INTEGER,\n  weight REAL,\n  status TEXT DEFAULT 'шукає дім'\n)"
const PETS_CHIP =
  "CREATE TABLE pets (\n  id INTEGER PRIMARY KEY,\n  name TEXT NOT NULL,\n  species TEXT,\n  age INTEGER,\n  weight REAL,\n  status TEXT DEFAULT 'шукає дім',\n  chip TEXT UNIQUE\n)"
const PETS_AGE =
  "CREATE TABLE pets (\n  id INTEGER PRIMARY KEY,\n  name TEXT NOT NULL,\n  species TEXT,\n  age INTEGER CHECK (age >= 0),\n  weight REAL,\n  status TEXT DEFAULT 'шукає дім',\n  chip TEXT UNIQUE\n)"
const PETS_SPECIES =
  "CREATE TABLE pets (\n  id INTEGER PRIMARY KEY,\n  name TEXT NOT NULL,\n  species TEXT CHECK (species IN ('кіт', 'пес', 'кролик')),\n  age INTEGER CHECK (age >= 0),\n  weight REAL,\n  status TEXT DEFAULT 'шукає дім',\n  chip TEXT UNIQUE\n)"

const PLAIN_CAT: Trial = {
  label: "Звичайний кіт Бублик",
  sql: "INSERT INTO pets (name, species, age, weight) VALUES ('Бублик', 'кіт', 2, 4.1)",
  why: "Таблиця не прийняла звичайного кота. Мабуть, якесь правило зайве або занадто суворе."
}

const NO_NAME: Trial = {
  label: "Тварина без клички",
  sql: "INSERT INTO pets (species, age) VALUES ('пес', 3)",
  why: "Таблиця прийняла тварину без клички. Додай `NOT NULL` до стовпця `name`."
}

const SAME_CHIP: Trial = {
  label: "Однаковий чип у двох тварин",
  sql: "INSERT INTO pets (name, species, chip) VALUES ('Мурка', 'кіт', 'UA-7'); INSERT INTO pets (name, species, chip) VALUES ('Барсик', 'кіт', 'UA-7')",
  why: "Таблиця прийняла двох тварин з одним номером чипа. Залиш `UNIQUE` у стовпці `chip`."
}

const NEGATIVE_AGE: Trial = {
  label: "Пес Шарик, вік −4",
  sql: "INSERT INTO pets (name, species, age) VALUES ('Шарик', 'пес', -4)",
  why: "Таблиця прийняла від'ємний вік. Додай `CHECK (age >= 0)`."
}

const CULPRIT_PHONE = "093-404-40-40"

/** An adoption request for the final trials. */
const request = (label: string, values: string, why: string): Trial => ({
  label,
  sql: `INSERT INTO requests (pet_id, name, phone, age) VALUES ${values}`,
  why
})

export const lostPaws: Case = {
  id: "lost-paws",
  title: "Справа про загублені лапи",
  summary:
    "Ліцей допомагає притулку «Лапа». Паперовий журнал тварин намок під дощем, і робот Біт пропонує збудувати базу даних з нуля. Створюй таблиці, додавай записи й правила крок за кроком, а в кінці з'ясуй, хто надсилає фальшиві заявки на тварин.",
  grades: "8–11",
  file: "притулок.db",
  chips: [
    "CREATE TABLE",
    "INTEGER",
    "TEXT",
    "REAL",
    "PRIMARY KEY",
    "NOT NULL",
    "DEFAULT",
    "UNIQUE",
    "CHECK",
    "REFERENCES",
    "INSERT INTO",
    "VALUES",
    "NULL",
    "DROP TABLE",
    "ALTER TABLE",
    "UPDATE",
    "SET",
    "DELETE FROM",
    "WHERE",
    "''"
  ],
  setup,
  tables: [
    {
      name: "old_journal",
      note: "Старий паперовий журнал притулку, переписаний як є, з помилками",
      columns: [
        { name: "line", type: "INTEGER", note: "номер рядка в журналі (ключ)" },
        { name: "name", type: "TEXT", note: "кличка; NULL, якщо не розібрати" },
        { name: "species", type: "TEXT", note: "вид: кіт, пес, кролик…" },
        { name: "age", type: "INTEGER", note: "вік, років" },
        { name: "weight", type: "REAL", note: "вага, кг" },
        { name: "chip", type: "TEXT", note: "номер чипа; NULL, якщо чипа немає" }
      ]
    }
  ],
  chapters: [
    {
      id: "create",
      title: "Порожня шафа",
      topics: "CREATE TABLE, типи стовпців",
      steps: [
        lesson({
          id: "lesson-create",
          title: "Урок: CREATE TABLE",
          story: [
            { speaker: "narrator", text: "Субота, притулок «Лапа». Учора злива промочила паперовий журнал тварин, і половину записів уже не прочитати." },
            {
              speaker: "robot",
              text: "Привіт, архітекторе! Я Біт. Цього разу ми не шукаємо дані, а будуємо базу з нуля. Спершу навчимося створювати таблиці."
            }
          ],
          explain: [
            "База даних схожа на шафу з таблицями. Таблиця має стовпці (що записуємо) і рядки (окремі записи). Нова база порожня: таблиці в ній треба створити.",
            "Таблицю створює команда `CREATE TABLE`. Після неї пишуть назву таблиці, а в дужках через кому перелічують стовпці. Кожен стовпець має назву і тип.",
            "Назви таблиць і стовпців пишуть латинськими літерами без пробілів, наприклад `cages` або `birth_year`.",
            "У прикладі після створення таблиці стоїть команда `INSERT`, щоб було що показати. Її ми розберемо в наступному розділі."
          ],
          why: "Дані про тварин треба зберігати так, щоб їх можна було швидко знайти, порахувати й перевірити. Таблиця з чіткими стовпцями надійніша за зошит: кожен запис має однакову форму, і нічого не загубиться між сторінками.",
          instead: [
            { way: "зошит або Excel", problem: "зручно для одного списку, але не перевіряє дані й не зв'язує таблиці між собою. База даних робить і те, і те." },
            { way: "одна таблиця для всього", problem: "якщо записати тварин, людей і кімнати в одну таблицю, дані повторюватимуться й плутатимуться. Тому для кожного виду речей окрема таблиця." }
          ],
          syntax: "CREATE TABLE таблиця (\n  стовпець1 ТИП,\n  стовпець2 ТИП\n)",
          notes: [
            { code: "CREATE TABLE", text: "створює нову таблицю" },
            { code: "( … )", text: "у дужках перелічують стовпці" },
            { code: ",", text: "розділяє стовпці; після останнього коми немає" },
            { code: ";", text: "закінчує команду, якщо далі йде ще одна" }
          ],
          example: "CREATE TABLE toys (\n  id INTEGER,\n  title TEXT\n);\nINSERT INTO toys VALUES (1, 'м''ячик');\nSELECT * FROM toys;"
        }),
        build({
          id: "first-table",
          title: "Перша таблиця",
          story: [
            { speaker: "witness", text: "Я пані Галина, керівниця притулку. Почнімо з простого: у нас є кілька кімнат і вольєрів для тварин." },
            {
              speaker: "robot",
              text: "Таблиця `cages` матиме два стовпці: номер `id` і назву `title`. Я вже почав команду, допиши другий стовпець і натисни **Виконати**."
            }
          ],
          task: "Створи таблицю `cages` зі стовпцями `id` (тип `INTEGER`) і `title` (тип `TEXT`).",
          solution: "CREATE TABLE cages (\n  id INTEGER,\n  title TEXT\n)",
          after: "INSERT INTO cages VALUES (1, 'Котяча кімната'), (2, 'Собачий вольєр'), (3, 'Кролятник')",
          tables: ["cages"],
          mustUse: ["CREATE TABLE"],
          hints: ["Після `id INTEGER` постав кому і напиши другий стовпець: назву, пробіл, тип.", "`CREATE TABLE cages (id INTEGER, title TEXT)`"],
          starter: "CREATE TABLE cages (\n  id INTEGER,\n  \n)",
          clue: "Перша таблиця готова! Біт записав у `cages` три приміщення притулку. Подивись на них у вкладці «Таблиці бази»."
        }),
        lesson({
          id: "lesson-types",
          title: "Урок: типи стовпців",
          story: [{ speaker: "robot", text: "Тип стовпця каже базі, що в ньому зберігається. Від типу залежить, як база порівнює й сортує значення." }],
          explain: [
            "`INTEGER` зберігає цілі числа: номер, вік, кількість. `REAL` зберігає дробові числа: вагу, ціну, температуру. Дробову частину відділяють крапкою: `4.5`.",
            "`TEXT` зберігає текст: кличку, вид, телефон, дату. Телефон є текстом, хоч і складається з цифр: з ним не рахують, а в ньому бувають дефіси й нулі на початку.",
            "Функція `typeof` у прикладі показує, якого типу вийшло кожне значення. Зміни значення і подивись, що зміниться."
          ],
          why: "Тип каже базі, що лежить у стовпці. Тоді вона правильно порівнює й сортує: число 10 більше за 9, а текст '10' менший за '9', бо текст порівнюють за першим символом.",
          instead: [
            { way: "`phone INTEGER`", problem: "телефон не число: з ним не рахують, а нуль на початку й дефіси зникнуть. Тому телефон зберігають як `TEXT`." },
            { way: "`weight INTEGER`", problem: "вага буває дробовою, 4.1 кг. Для неї потрібен `REAL`." },
            { way: "`age TEXT`", problem: "текст порівнюється за символами, і вік '10' виявиться меншим за '9'. Для віку потрібен `INTEGER`." }
          ],
          syntax: "стовпець INTEGER | REAL | TEXT",
          notes: [
            { code: "INTEGER", text: "ціле число: 7, 0, -3" },
            { code: "REAL", text: "дробове число: 4.5, 23.0" },
            { code: "TEXT", text: "текст в одинарних лапках: 'Бублик', '067-101-01-01'" }
          ],
          example:
            "CREATE TABLE test (\n  age INTEGER,\n  weight REAL,\n  phone TEXT\n);\nINSERT INTO test VALUES (7, 4.5, '067-101-01-01');\nSELECT age, typeof(age), weight, typeof(weight), phone, typeof(phone) FROM test;"
        }),
        build({
          id: "create-pets",
          title: "Таблиця тварин",
          story: [
            { speaker: "witness", text: "Про кожну тварину ми записуємо номер, кличку, вид, вік і вагу. Допоможіть зробити це в комп'ютері!" },
            { speaker: "robot", text: "Створимо таблицю `pets`. Подумай, який тип потрібен кожному стовпцю: вага буває дробовою, а вік ми пишемо цілим числом." }
          ],
          task: "Створи таблицю `pets` зі стовпцями `id` (номер), `name` (кличка), `species` (вид), `age` (вік, ціле число) і `weight` (вага, дробове число).",
          solution: PETS_V1,
          tables: ["pets"],
          mustUse: ["CREATE TABLE"],
          hints: [
            "Номер і вік мають тип `INTEGER`, кличка й вид мають тип `TEXT`, а вага має тип `REAL`.",
            "`CREATE TABLE pets (id INTEGER, name TEXT, species TEXT, age INTEGER, weight REAL)`"
          ],
          starter: "CREATE TABLE pets (\n  \n)",
          clue: "Таблиця `pets` готова: номер, кличка, вид, вік і вага."
        }),
        build({
          id: "fix-volunteers",
          title: "Помилка волонтера",
          story: [
            { speaker: "witness", text: "Наш волонтер Роман теж спробував створити таблицю для волонтерів, але комп'ютер видає помилку." },
            {
              speaker: "robot",
              text: "Його команда вже в редакторі. Натисни **Виконати** і прочитай помилку: вона вказує на місце біля дужки. І ще: вік має бути числом, а не текстом."
            }
          ],
          task: "Виправ команду: таблиця `volunteers` має стовпці `id`, `name`, `phone` (текст) і `age` (ціле число).",
          solution: "CREATE TABLE volunteers (\n  id INTEGER,\n  name TEXT,\n  phone TEXT,\n  age INTEGER\n)",
          after: `INSERT INTO volunteers VALUES
  (1, 'Галина Остапенко', '067-101-01-01', 45),
  (2, 'Роман Зайченко', '063-606-06-06', 22),
  (3, 'Віктор Гаврилюк', '${CULPRIT_PHONE}', 29),
  (4, 'Ліна Шевчук', '096-505-05-05', 16),
  (5, 'Дмитро Коваль', '050-202-02-02', 17)`,
          tables: ["volunteers"],
          hints: [
            "Після останнього стовпця кома не потрібна: SQLite чекає ще один стовпець і натрапляє на дужку.",
            "Вік: `age INTEGER`. Уся команда: `CREATE TABLE volunteers (id INTEGER, name TEXT, phone TEXT, age INTEGER)`"
          ],
          starter: "CREATE TABLE volunteers (\n  id INTEGER,\n  name TEXT,\n  phone TEXT,\n  age TEXT,\n)",
          clue: "Таблицю `volunteers` виправлено. Біт уже переписав туди п'ятьох волонтерів притулку."
        }),
        build({
          id: "silent-comma",
          title: "Тиха помилка",
          story: [
            { speaker: "witness", text: "А ось таблиця кормів від Ліни. Комп'ютер не сварився, але щось із нею не так." },
            {
              speaker: "robot",
              text: "Виконай команду і відкрий вкладку «Таблиці бази». Скільки стовпців у `feeds`? Без коми SQLite вважає `price REAL` частиною типу стовпця `title`. Така помилка не видає повідомлення, тому її легко пропустити."
            }
          ],
          task: "Виправ команду, щоб таблиця `feeds` мала три стовпці: `id` (ціле число), `title` (текст) і `price` (дробове число).",
          solution: "CREATE TABLE feeds (\n  id INTEGER,\n  title TEXT,\n  price REAL\n)",
          tables: ["feeds"],
          hints: ["Подивись, чого бракує в кінці рядка з `title`.", "Постав кому після `title TEXT`."],
          starter: "CREATE TABLE feeds (\n  id INTEGER,\n  title TEXT\n  price REAL\n)",
          clue: "Помилка без повідомлення теж буває. Після `CREATE TABLE` завжди перевіряй таблицю у вкладці «Таблиці бази»."
        })
      ]
    },
    {
      id: "insert",
      title: "Перші мешканці",
      topics: "INSERT INTO, VALUES, NULL",
      steps: [
        lesson({
          id: "lesson-insert",
          title: "Урок: INSERT INTO",
          story: [{ speaker: "robot", text: "Таблиця без рядків схожа на порожню шафу. Додамо записи." }],
          explain: [
            "Рядок додає команда `INSERT INTO`. Після назви таблиці пишуть `VALUES`, а в дужках перелічують значення в тому самому порядку, що й стовпці.",
            "Текст беруть в одинарні лапки: `'Бублик'`. Числа пишуть без лапок, а дробову частину відділяють крапкою: `4.1`.",
            "Одна команда може додати кілька рядків: дужки з рядками розділяють комою."
          ],
          why: "Порожня таблиця нічого не знає. `INSERT` записує в неї факти: кожна нова тварина притулку стає одним рядком.",
          instead: [
            { way: "`CREATE TABLE` з даними", problem: "`CREATE TABLE` створює лише форму таблиці, тобто стовпці. Рядки завжди додає окрема команда `INSERT`." },
            { way: "`Бублик` без лапок", problem: "без лапок база шукає стовпець з такою назвою і показує помилку. Текст завжди беруть в одинарні лапки." },
            { way: "`4,1` замість `4.1`", problem: "кома в SQL розділяє значення, тому `4,1` стане двома числами. Дробову частину пишуть через крапку." }
          ],
          syntax: "INSERT INTO таблиця VALUES\n  (значення1, значення2),\n  (значення1, значення2)",
          notes: [
            { code: "INSERT INTO", text: "додає рядки в таблицю" },
            { code: "VALUES", text: "значення нових рядків" },
            { code: "'текст'", text: "текст завжди в одинарних лапках" },
            { code: "4.1", text: "дробове число пишуть з крапкою, без лапок" }
          ],
          example: "INSERT INTO pets VALUES (100, 'Тестик', 'кіт', 1, 3.0);\nSELECT * FROM pets;"
        }),
        build({
          id: "insert-one",
          title: "Перша картка",
          story: [
            { speaker: "witness", text: "Ось перша картка, яка вціліла:" },
            { speaker: "narrator", text: "№1 — Бублик, кіт, 2 роки, 4.1 кг." },
            { speaker: "robot", text: "Значення пиши в порядку стовпців таблиці `pets`: номер, кличка, вид, вік, вага." }
          ],
          task: "Додай у таблицю `pets` картку Бублика.",
          solution: "INSERT INTO pets VALUES (1, 'Бублик', 'кіт', 2, 4.1)",
          tables: ["pets"],
          data: ["pets"],
          mustUse: ["INSERT"],
          hints: ["Кличку й вид візьми в одинарні лапки, а числа пиши без лапок.", "`INSERT INTO pets VALUES (1, 'Бублик', 'кіт', 2, 4.1)`"],
          starter: "INSERT INTO pets VALUES (",
          clue: "Бублик став першим мешканцем бази."
        }),
        build({
          id: "insert-many",
          title: "Ще дві картки",
          story: [
            { speaker: "narrator", text: "№2 — Рекс, пес, 5 років, 23.5 кг. №3 — Хмаринка, кролик, 1 рік, 1.8 кг." },
            { speaker: "robot", text: "Бублик уже в базі. Додай двох нових однією командою: дужки рядків розділи комою." }
          ],
          task: "Додай у `pets` Рекса і Хмаринку однією командою `INSERT`.",
          solution: "INSERT INTO pets VALUES\n  (2, 'Рекс', 'пес', 5, 23.5),\n  (3, 'Хмаринка', 'кролик', 1, 1.8)",
          tables: ["pets"],
          data: ["pets"],
          mustUse: ["INSERT"],
          hints: ["Після першої дужки постав кому і напиши другу: `(…), (…)`.", "`INSERT INTO pets VALUES (2, 'Рекс', 'пес', 5, 23.5), (3, 'Хмаринка', 'кролик', 1, 1.8)`"],
          starter: "INSERT INTO pets VALUES\n  (2, 'Рекс', 'пес', 5, 23.5)",
          clue: "У базі вже три тварини: Бублик, Рекс і Хмаринка."
        }),
        lesson({
          id: "lesson-null",
          title: "Урок: NULL і список стовпців",
          story: [{ speaker: "robot", text: "Буває, що якесь значення невідоме. Для цього в базах даних є особливе значення `NULL`." }],
          explain: [
            "`NULL` означає «невідомо» або «порожньо». Це не нуль і не порожній текст. Його пишуть без лапок.",
            "Після назви таблиці можна в дужках перелічити лише ті стовпці, які заповнюєш. Решта стовпців отримає `NULL`.",
            "Рядки, де значення невідоме, знаходить умова `IS NULL`. Знак `=` тут не працює: `age = NULL` не знайде нічого."
          ],
          why: "Не все відомо одразу: вік цуценяти визначить лише ветеринар. `NULL` чесно каже «поки не знаємо» і не вигадує значення.",
          instead: [
            { way: "`age = 0`", problem: "нуль означає «новонароджене», а це неправда. Нулі зіпсують і середній вік, а `NULL` у підрахунках пропускається." },
            { way: "`'NULL'` або `''`", problem: "у лапках це звичайний текст, а не «невідомо». `NULL` пишуть без лапок." },
            { way: "`WHERE age = NULL`", problem: "порівняння з невідомим дає «невідомо», тому такий запит не знайде нічого. Пиши `age IS NULL`." }
          ],
          syntax: "INSERT INTO таблиця (стовпець1, стовпець2)\nVALUES (значення1, значення2)",
          notes: [
            { code: "NULL", text: "значення невідоме" },
            { code: "(id, name)", text: "лише ці стовпці заповнюємо, решта NULL" },
            { code: "WHERE age IS NULL", text: "рядки, де вік невідомий" },
            { code: "IS NOT NULL", text: "рядки, де значення є" }
          ],
          example: "INSERT INTO pets (id, name, species) VALUES (100, 'Невідомко', 'кіт');\nSELECT * FROM pets WHERE age IS NULL;"
        }),
        build({
          id: "insert-puppies",
          title: "Цуценята без віку",
          story: [
            { speaker: "witness", text: "Вчора нам підкинули двох цуценят: Луну (3.2 кг) і Сонька (2.9 кг). Скільки їм, ми не знаємо." },
            { speaker: "robot", text: "Вік невідомий, тому в стовпці `age` має бути `NULL`. Дай їм номери 4 і 5." }
          ],
          task: "Додай у `pets` цуценят №4 Луну і №5 Сонька (вид «пес») без віку.",
          solution: "INSERT INTO pets (id, name, species, weight) VALUES\n  (4, 'Луна', 'пес', 3.2),\n  (5, 'Сонько', 'пес', 2.9)",
          tables: ["pets"],
          data: ["pets"],
          mustUse: ["INSERT"],
          hints: [
            "Перелічи після назви таблиці лише відомі стовпці: `INSERT INTO pets (id, name, species, weight)`. Або напиши `NULL` на місці віку.",
            "`INSERT INTO pets (id, name, species, weight) VALUES (4, 'Луна', 'пес', 3.2), (5, 'Сонько', 'пес', 2.9)`"
          ],
          starter: "",
          clue: "Луна й Сонько в базі. Їхній вік поки `NULL`: ветеринар визначить його пізніше."
        }),
        {
          kind: "query",
          id: "unknown-age",
          title: "Кому ще визначити вік",
          story: [{ speaker: "witness", text: "Ветеринар приходить завтра. Покажіть, будь ласка, яких тварин йому треба оглянути: тих, у кого вік невідомий." }],
          task: "Покажи клички (`name`) тварин з таблиці `pets`, у яких вік невідомий.",
          solution: "SELECT name FROM pets WHERE age IS NULL",
          ordered: false,
          mustUse: ["IS NULL"],
          hints: ["Умова для невідомого значення: `IS NULL`, а не `= NULL`.", "`SELECT name FROM pets WHERE age IS NULL`"],
          starter: "SELECT name FROM pets WHERE ",
          clue: "Ветеринар огляне Луну й Сонька."
        },
        build({
          id: "insert-error",
          title: "Забуті лапки",
          story: [
            { speaker: "witness", text: "Роман додає кішку Мурку: №6, 7 років, 4.5 кг. Але база відповідає щось незрозуміле." },
            { speaker: "robot", text: "Виконай його команду і прочитай помилку. Чому база шукає стовпець з назвою «Мурка»?" }
          ],
          task: "Виправ команду Романа, щоб Мурка потрапила в таблицю `pets`.",
          solution: "INSERT INTO pets VALUES (6, 'Мурка', 'кіт', 7, 4.5)",
          tables: ["pets"],
          data: ["pets"],
          mustUse: ["INSERT"],
          hints: ["Слово без лапок база вважає назвою стовпця. Текст бери в одинарні лапки.", "`INSERT INTO pets VALUES (6, 'Мурка', 'кіт', 7, 4.5)`"],
          starter: "INSERT INTO pets VALUES (6, Мурка, 'кіт', 7, 4.5)",
          clue: "Текст без лапок база читає як назву стовпця. Мурка вже в базі."
        })
      ]
    },
    {
      id: "key",
      title: "Номер на нашийнику",
      topics: "PRIMARY KEY, DROP TABLE",
      steps: [
        lesson({
          id: "lesson-key",
          title: "Урок: PRIMARY KEY",
          story: [{ speaker: "robot", text: "Номери ми досі вигадували самі. Так легко помилитися: дві тварини можуть отримати однаковий номер." }],
          explain: [
            "Первинний ключ (`PRIMARY KEY`) є стовпцем, за яким кожен рядок можна знайти точно. Два рядки не можуть мати однаковий ключ.",
            "Якщо написати `id INTEGER PRIMARY KEY`, SQLite сам дає новому рядку наступний номер. Номер у `INSERT` тоді можна не писати, а стовпці перелічити.",
            "Таблицю, яку вже створено, не можна створити ще раз. Стару таблицю видаляє `DROP TABLE` разом з усіма її рядками."
          ],
          why: "Тварин з однаковою кличкою може бути кілька, а кожну треба знайти точно, щоб віддати саме того Рекса. Ключ дає кожному рядку неповторний номер, як номер на нашийнику.",
          instead: [
            { way: "номер вручну", problem: "люди помиляються: двоє волонтерів дадуть двом тваринам номер 5. `INTEGER PRIMARY KEY` сам дає наступний вільний номер." },
            { way: "кличка як ключ", problem: "клички повторюються: у притулку може жити два Бублики. Ключ має бути неповторним завжди." },
            { way: "`id INT PRIMARY KEY`", problem: "у SQLite номер сам дає лише точне `INTEGER PRIMARY KEY`. З `INT` новий рядок без номера отримає `NULL`." }
          ],
          syntax: "CREATE TABLE таблиця (\n  id INTEGER PRIMARY KEY,\n  …\n)",
          notes: [
            { code: "PRIMARY KEY", text: "первинний ключ: значення не повторюються" },
            { code: "INTEGER PRIMARY KEY", text: "номер, який SQLite дає сам" },
            { code: "DROP TABLE", text: "видаляє таблицю з усіма рядками" }
          ],
          example: "CREATE TABLE toys (\n  id INTEGER PRIMARY KEY,\n  title TEXT\n);\nINSERT INTO toys (title) VALUES ('м''ячик'), ('кістка');\nSELECT * FROM toys;"
        }),
        build({
          id: "key-pets",
          title: "Ключ для тварин",
          story: [
            { speaker: "witness", text: "Біда! Двоє волонтерів одночасно записали нових котів, і обидва дали їм номер 7." },
            {
              speaker: "robot",
              text: "Перебудуємо `pets`, щоб номер давався сам і не міг повторитися. Картки я збережу, а таблицю видали й створи знову."
            }
          ],
          task: "Видали таблицю `pets` і створи її знову з тими самими стовпцями, але `id` має бути ключем, який SQLite заповнює сам.",
          solution: `DROP TABLE pets;\n${PETS_KEY}`,
          tables: ["pets"],
          trials: [
            {
              label: "Нова тварина без номера",
              sql: "INSERT INTO pets (name, species, age, weight) VALUES ('Ріжок', 'кіт', 1, 3.0); SELECT id FROM pets WHERE name = 'Ріжок'",
              why: "Ріжок не отримав номер 1. Номер дає сам лише `id INTEGER PRIMARY KEY`: саме `INTEGER`, а не `INT`."
            },
            {
              label: "Два коти з номером 7",
              sql: "INSERT INTO pets (id, name, species) VALUES (7, 'Мурка', 'кіт'); INSERT INTO pets (id, name, species) VALUES (7, 'Барсик', 'кіт')",
              why: "Таблиця прийняла двох тварин з номером 7. Ключ `PRIMARY KEY` не дає повторити номер."
            },
            {
              label: "Ще дві тварини поспіль",
              sql: "INSERT INTO pets (name, species) VALUES ('Ґудзик', 'пес'), ('Квасоля', 'кролик'); SELECT id, name FROM pets",
              why: "Нові тварини мають отримати номери 1 і 2 по черзі."
            }
          ],
          mustUse: ["PRIMARY KEY"],
          hints: [
            "Спершу `DROP TABLE pets;`, потім `CREATE TABLE pets (…)`. Між командами стоїть крапка з комою.",
            "Перший стовпець: `id INTEGER PRIMARY KEY`. Решта стовпців такі самі, як раніше."
          ],
          starter: `DROP TABLE pets;\n${PETS_V1}`,
          clue: "Тепер у кожної тварини свій номер, і двох сьомих котів більше не буде."
        }),
        build({
          id: "insert-auto",
          title: "Номер дається сам",
          story: [
            { speaker: "robot", text: "Таблиця нова й порожня. Повернімо картки Бублика, Рекса й Хмаринки, але цього разу без номерів: база дасть їх сама." },
            { speaker: "narrator", text: "Бублик — кіт, 2 роки, 4.1 кг. Рекс — пес, 5 років, 23.5 кг. Хмаринка — кролик, 1 рік, 1.8 кг." }
          ],
          task: "Додай у `pets` трьох тварин з карток, не вказуючи `id`.",
          solution: "INSERT INTO pets (name, species, age, weight) VALUES\n  ('Бублик', 'кіт', 2, 4.1),\n  ('Рекс', 'пес', 5, 23.5),\n  ('Хмаринка', 'кролик', 1, 1.8)",
          tables: ["pets"],
          data: ["pets"],
          mustUse: ["INSERT"],
          hints: [
            "Перелічи стовпці без `id`: `INSERT INTO pets (name, species, age, weight) VALUES …`",
            "`… VALUES ('Бублик', 'кіт', 2, 4.1), ('Рекс', 'пес', 5, 23.5), ('Хмаринка', 'кролик', 1, 1.8)`"
          ],
          starter: "INSERT INTO pets (name, species, age, weight) VALUES\n  ",
          clue: "База сама дала тваринам номери 1, 2 і 3."
        })
      ]
    },
    {
      id: "required",
      title: "Обов'язкові поля",
      topics: "NOT NULL, DEFAULT",
      steps: [
        lesson({
          id: "lesson-not-null",
          title: "Урок: NOT NULL",
          story: [{ speaker: "robot", text: "Хороша таблиця сама не пускає неправильні записи. Для цього в SQL є правила, або обмеження. Почнемо з найпростішого." }],
          explain: [
            "Правило пишуть після типу стовпця. Якщо запис порушує правило, база не додає його і показує помилку.",
            "`NOT NULL` забороняє порожнє значення: у стовпці завжди має бути щось записано.",
            "У прикладі друга команда `INSERT` порушує правило, тому вона вимкнена: два дефіси `--` на початку рядка роблять його коментарем. Прибери `--`, виконай приклад і прочитай помилку."
          ],
          why: "Деякі дані потрібні завжди: тварину без клички не знайдуть ні волонтери, ні нові господарі. Правило в таблиці стежить за цим саме, навіть коли людина забуде.",
          instead: [
            { way: "перевіряти очима", problem: "людина втомлюється й пропускає помилки, особливо серед сотень записів. Правило в таблиці перевіряє кожен запис без винятку." },
            { way: "`NOT NULL` у кожному стовпці", problem: "тоді не вийде записати цуценя з невідомим віком. Обов'язковим роблять лише те, без чого запис не має сенсу." }
          ],
          syntax: "стовпець ТИП NOT NULL",
          notes: [
            { code: "NOT NULL", text: "значення обов'язкове" },
            { code: "NOT NULL constraint failed", text: "так SQLite каже, що правило порушено" }
          ],
          example:
            "CREATE TABLE toys (\n  id INTEGER PRIMARY KEY,\n  title TEXT NOT NULL\n);\nINSERT INTO toys (title) VALUES ('м''ячик');\n-- INSERT INTO toys (title) VALUES (NULL);\nSELECT * FROM toys;"
        }),
        build({
          id: "rule-name",
          title: "Кличка обов'язкова",
          story: [
            { speaker: "witness", text: "У старому журналі є тварина взагалі без клички. Хто це? Ніхто не пам'ятає. Більше так не можна!" },
            { speaker: "robot", text: "Я вставив у редактор нашу таблицю. Додай правило до стовпця `name`." }
          ],
          task: "Перестав таблицю `pets` так, щоб кличка `name` була обов'язковою.",
          solution: `DROP TABLE pets;\n${PETS_NAME}`,
          tables: ["pets"],
          trials: [
            PLAIN_CAT,
            NO_NAME,
            {
              label: "Кличка NULL",
              sql: "INSERT INTO pets (name, species) VALUES (NULL, 'кіт')",
              why: "Таблиця прийняла `NULL` замість клички. Додай `NOT NULL` до стовпця `name`."
            },
            {
              label: "Тварина без віку",
              sql: "INSERT INTO pets (name, species) VALUES ('Луна', 'пес')",
              why: "Вік може бути невідомим. Правило `NOT NULL` потрібне лише для `name`."
            }
          ],
          mustUse: ["NOT NULL"],
          hints: ["Допиши правило після типу клички: `name TEXT …`.", "`name TEXT NOT NULL,`"],
          starter: `DROP TABLE pets;\n${PETS_KEY}`,
          clue: "Без клички тварину вже не записати."
        }),
        lesson({
          id: "lesson-default",
          title: "Урок: DEFAULT",
          story: [{ speaker: "robot", text: "Деякі значення майже завжди однакові. Щоб не писати їх щоразу, база може підставляти їх сама." }],
          explain: [
            "`DEFAULT значення` задає, що стовпець отримає, якщо в `INSERT` його не вказали.",
            "Якщо значення вказали, база запише саме його. Тобто `DEFAULT` не забороняє інших значень."
          ],
          why: "Майже кожна нова тварина «шукає дім». Якщо писати це щоразу вручну, хтось колись забуде, і статус стане `NULL`. `DEFAULT` підставляє звичайне значення сам.",
          instead: [
            { way: "`NOT NULL`", problem: "заборонить забути статус, але змусить писати його в кожному `INSERT`. `DEFAULT` просто підставить звичайне значення." },
            { way: "`UPDATE` після `INSERT`", problem: "можна виправляти статус окремою командою, але це зайва робота, і її теж легко забути." }
          ],
          syntax: "стовпець ТИП DEFAULT значення",
          notes: [
            { code: "DEFAULT 'на складі'", text: "текст за замовчуванням, у лапках" },
            { code: "DEFAULT 0", text: "число за замовчуванням" }
          ],
          example:
            "CREATE TABLE toys (\n  id INTEGER PRIMARY KEY,\n  title TEXT NOT NULL,\n  state TEXT DEFAULT 'на складі'\n);\nINSERT INTO toys (title) VALUES ('м''ячик');\nINSERT INTO toys (title, state) VALUES ('кістка', 'продано');\nSELECT * FROM toys;"
        }),
        build({
          id: "rule-status",
          title: "Статус нової тварини",
          story: [
            { speaker: "witness", text: "Кожна нова тварина в нас спершу «шукає дім». Хворих ми позначаємо «лікується»." },
            { speaker: "robot", text: "Додамо до `pets` новий стовпець `status`. Правило для клички залиш." }
          ],
          task: "Перестав таблицю `pets`: додай текстовий стовпець `status`, який отримує «шукає дім», якщо статус не вказали.",
          solution: `DROP TABLE pets;\n${PETS_STATUS}`,
          tables: ["pets"],
          trials: [
            {
              label: "Статус нової тварини",
              sql: "INSERT INTO pets (name, species) VALUES ('Бублик', 'кіт'); SELECT status FROM pets",
              why: "Статус нової тварини має бути «шукає дім». Додай `DEFAULT 'шукає дім'` до стовпця `status`."
            },
            {
              label: "Хвора тварина «лікується»",
              sql: "INSERT INTO pets (name, species, status) VALUES ('Рекс', 'пес', 'лікується'); SELECT status FROM pets",
              why: "Якщо статус указали, база має записати саме його."
            },
            NO_NAME
          ],
          mustUse: ["DEFAULT"],
          hints: [
            "Після останнього стовпця постав кому і допиши `status TEXT DEFAULT …`. Текст бери в одинарні лапки.",
            "`status TEXT DEFAULT 'шукає дім'`"
          ],
          starter: `DROP TABLE pets;\n${PETS_NAME}`,
          clue: "Нова тварина одразу «шукає дім», і це не треба писати щоразу."
        })
      ]
    },
    {
      id: "rules",
      title: "Неповторні й правильні",
      topics: "UNIQUE, CHECK, повторення правил",
      steps: [
        lesson({
          id: "lesson-unique",
          title: "Урок: UNIQUE",
          story: [{ speaker: "robot", text: "Ключ `id` не повторюється. А якщо неповторним має бути ще якийсь стовпець?" }],
          explain: [
            "`UNIQUE` забороняє два однакові значення в стовпці.",
            "Але `NULL` означає «невідомо», а два невідомі значення база не вважає однаковими. Тому `UNIQUE` дозволяє кілька `NULL`."
          ],
          why: "Номер чипа належить лише одній тварині. Якщо в двох тварин однаковий чип, сканер ветеринара покаже не ту тварину. `UNIQUE` не дасть записати той самий номер двічі.",
          instead: [
            { way: "`PRIMARY KEY`", problem: "ключ у таблиці лише один, і в нас це `id`. До того ж чипа може не бути, а ключ порожнім не буває." },
            { way: "шукати повтори через `SELECT`", problem: "запит знайде повтор, коли він уже є. `UNIQUE` не дасть йому з'явитися." }
          ],
          syntax: "стовпець ТИП UNIQUE",
          notes: [
            { code: "UNIQUE", text: "значення не повторюються" },
            { code: "UNIQUE constraint failed", text: "так SQLite каже, що таке значення вже є" }
          ],
          example:
            "CREATE TABLE toys (\n  id INTEGER PRIMARY KEY,\n  code TEXT UNIQUE\n);\nINSERT INTO toys (code) VALUES ('T-1'), ('T-2'), (NULL), (NULL);\nSELECT * FROM toys;"
        }),
        build({
          id: "rule-chip",
          title: "Номер чипа",
          story: [
            { speaker: "witness", text: "Багатьом тваринам вшито чип з номером. Номер у кожного чипа свій. Але є тварини й без чипа." },
            { speaker: "robot", text: "Додамо стовпець `chip`. Подумай, яке правило не дасть повторити номер." }
          ],
          task: "Додай до `pets` текстовий стовпець `chip`, у якому номери не можуть повторюватися. Правила попередніх кроків залиш.",
          solution: `DROP TABLE pets;\n${PETS_CHIP}`,
          tables: ["pets"],
          trials: [
            {
              label: "Два різні чипи",
              sql: "INSERT INTO pets (name, species, chip) VALUES ('Мурка', 'кіт', 'UA-1'), ('Рекс', 'пес', 'UA-2')",
              why: "Таблиця не прийняла двох тварин з різними чипами."
            },
            SAME_CHIP,
            {
              label: "Дві тварини без чипа",
              sql: "INSERT INTO pets (name, species) VALUES ('Хмаринка', 'кролик'), ('Сніжок', 'кролик')",
              why: "Тварин без чипа може бути кілька: `UNIQUE` дозволяє кілька `NULL`. Не пиши `NOT NULL` для `chip`."
            },
            NO_NAME
          ],
          mustUse: ["UNIQUE"],
          hints: ["Після останнього стовпця постав кому і допиши `chip TEXT …`.", "`chip TEXT UNIQUE`"],
          starter: `DROP TABLE pets;\n${PETS_STATUS}`,
          clue: "Два однакові чипи тепер неможливі, а тварини без чипа приймаються."
        }),
        lesson({
          id: "lesson-check",
          title: "Урок: CHECK",
          story: [{ speaker: "robot", text: "Останнє правило найсильніше: воно перевіряє значення будь-якою умовою." }],
          explain: [
            "`CHECK (умова)` пропускає лише ті значення, для яких умова правдива. Умову пишуть так само, як у `WHERE`.",
            "Для невідомого значення (`NULL`) умова не може бути хибною, тому `CHECK` пропускає `NULL`. Щоб заборонити й `NULL`, додають `NOT NULL`.",
            "Зручна умова для списку: `IN ('a', 'b', 'c')` правдива, якщо значення є одним зі списку."
          ],
          why: "Вік не буває від'ємним, а в притулку живуть лише коти, пси й кролики. `CHECK` записує такі правила світу в таблицю, і база сама відкидає неможливі записи, як вік −4.",
          instead: [
            { way: "`NOT NULL`", problem: "перевіряє лише, що значення є. Чи воно правильне, `NOT NULL` не знає." },
            { way: "`species = 'кіт' OR species = 'пес' OR …`", problem: "так теж правильно, але довго. `IN ('кіт', 'пес', 'кролик')` коротше й легше читається." },
            { way: "окрема таблиця видів", problem: "у великих базах види часто тримають в окремій таблиці і зв'язують ключем. Для трьох видів простіше `CHECK`." }
          ],
          syntax: "стовпець ТИП CHECK (умова)",
          notes: [
            { code: "CHECK (price > 0)", text: "ціна більша за нуль" },
            { code: "CHECK (age >= 0)", text: "вік нуль або більший" },
            { code: "IN ('a', 'b')", text: "одне зі значень у списку" },
            { code: "CHECK constraint failed", text: "так SQLite каже, що умова не виконана" }
          ],
          example:
            "CREATE TABLE toys (\n  id INTEGER PRIMARY KEY,\n  price REAL CHECK (price > 0),\n  size TEXT CHECK (size IN ('S', 'M', 'L'))\n);\nINSERT INTO toys (price, size) VALUES (45, 'M');\nSELECT * FROM toys;"
        }),
        build({
          id: "check-age",
          title: "Від'ємний вік",
          story: [
            { speaker: "witness", text: "У старому журналі є пес Шарик з віком «−4». Такого не буває!" },
            { speaker: "robot", text: "Правило `CHECK` для віку. Подумай, чи можна кошеняті мати вік 0: так, якщо йому менше року." }
          ],
          task: "Додай до стовпця `age` таблиці `pets` правило: вік не може бути від'ємним.",
          solution: `DROP TABLE pets;\n${PETS_AGE}`,
          tables: ["pets"],
          trials: [
            NEGATIVE_AGE,
            {
              label: "Кошеня, вік 0",
              sql: "INSERT INTO pets (name, species, age) VALUES ('Зефірка', 'кіт', 0)",
              why: "Кошеня, якому менше року, має вік 0, і це правильно. Перевір знак у `CHECK`: потрібно `>=`, а не `>`."
            },
            {
              label: "Цуценя з невідомим віком",
              sql: "INSERT INTO pets (name, species) VALUES ('Луна', 'пес')",
              why: "Вік може бути невідомим (`NULL`). Не забороняй його."
            },
            SAME_CHIP
          ],
          mustUse: ["CHECK"],
          hints: ["Правило пишуть після типу: `age INTEGER CHECK (…)`.", "`age INTEGER CHECK (age >= 0)`"],
          starter: `DROP TABLE pets;\n${PETS_CHIP}`,
          clue: "Від'ємного віку в базі більше не буде."
        }),
        build({
          id: "check-species",
          title: "Лише наші види",
          story: [
            { speaker: "witness", text: "А ще в журналі записано папугу Кешу. Але папуг ми не беремо: у нас лише коти, пси й кролики." },
            { speaker: "robot", text: "Знадобиться `CHECK` зі списком `IN`. Пиши види саме так, як у журналі: «кіт», «пес», «кролик»." }
          ],
          task: "Додай до стовпця `species` таблиці `pets` правило: вид може бути лише «кіт», «пес» або «кролик».",
          solution: `DROP TABLE pets;\n${PETS_SPECIES}`,
          after:
            "INSERT INTO pets (name, species, age, weight, chip)\n  SELECT name, species, age, weight, chip FROM old_journal WHERE line NOT IN (4, 7, 8, 12) ORDER BY line",
          tables: ["pets"],
          trials: [
            {
              label: "Папуга Кеша",
              sql: "INSERT INTO pets (name, species, age) VALUES ('Кеша', 'папуга', 2)",
              why: "Таблиця прийняла папугу. Додай `CHECK (species IN ('кіт', 'пес', 'кролик'))`."
            },
            {
              label: "Кролик Пухнастик",
              sql: "INSERT INTO pets (name, species, age) VALUES ('Пухнастик', 'кролик', 2)",
              why: "Таблиця не прийняла кролика. Перевір список видів: «кіт», «пес», «кролик»."
            },
            {
              label: "Пес Тайсон",
              sql: "INSERT INTO pets (name, species, age) VALUES ('Тайсон', 'пес', 3)",
              why: "Таблиця не прийняла пса. Перевір, як написано «пес» у списку."
            },
            NEGATIVE_AGE
          ],
          mustUse: ["CHECK"],
          hints: ["Правило для виду: `species TEXT CHECK (species IN (…))`, у дужках три слова в лапках через кому.", "`species TEXT CHECK (species IN ('кіт', 'пес', 'кролик'))`"],
          starter: `DROP TABLE pets;\n${PETS_AGE}`,
          clue: "Біт переніс у `pets` записи старого журналу, які пройшли всі правила."
        }),
        {
          kind: "answer",
          id: "journal-count",
          title: "Що не пройшло",
          story: [
            {
              speaker: "robot",
              text: "Я переписав старий журнал `old_journal` у нову таблицю `pets` рядок за рядком. Деякі записи таблиця відхилила: вони порушують наші правила."
            }
          ],
          question: "Скільки записів старого журналу не пройшли правила таблиці `pets`?",
          accepted: ["4", "чотири"],
          hints: [
            "Порівняй `SELECT COUNT(*) FROM old_journal` і `SELECT COUNT(*) FROM pets`.",
            "Або знайди порушників: `SELECT * FROM old_journal WHERE name IS NULL OR age < 0 OR species NOT IN ('кіт', 'пес', 'кролик')`"
          ],
          clue: "Чотири записи журналу не пройшли: без клички, з від'ємним віком (двічі) і папуга."
        },
        build({
          id: "create-people",
          title: "Люди, які беруть тварин",
          story: [
            { speaker: "witness", text: "Тварину віддаємо лише дорослим, від 18 років. Ім'я й телефон обов'язкові, і на один телефон записуємо одну людину." },
            { speaker: "robot", text: "Повторимо все, що ти вже знаєш, в одній новій таблиці. Ключ `id` дай такий самий, як у `pets`." }
          ],
          task: "Створи таблицю `people`: `id` (ключ, що заповнюється сам), `name` (обов'язкове), `phone` (обов'язковий і неповторний) і `age` (ціле число, не менше 18).",
          solution: "CREATE TABLE people (\n  id INTEGER PRIMARY KEY,\n  name TEXT NOT NULL,\n  phone TEXT NOT NULL UNIQUE,\n  age INTEGER CHECK (age >= 18)\n)",
          after: `INSERT INTO people (name, phone, age) VALUES
  ('Оксана Бондар', '067-210-11-01', 34),
  ('Тарас Мельник', '050-333-12-12', 41),
  ('Ірина Ткач', '063-555-77-10', 28),
  ('Олег Савчук', '097-120-45-45', 52),
  ('Марія Кравець', '066-808-90-90', 19),
  ('Андрій Лисенко', '073-700-01-02', 37)`,
          tables: ["people"],
          trials: [
            {
              label: "Оксана, 34 роки",
              sql: "INSERT INTO people (name, phone, age) VALUES ('Оксана', '067-210-11-01', 34); SELECT id FROM people",
              why: "Оксана має пройти і отримати номер 1. Перевір `id INTEGER PRIMARY KEY` і правила."
            },
            {
              label: "Людина без імені",
              sql: "INSERT INTO people (phone, age) VALUES ('067-000-00-01', 30)",
              why: "Таблиця прийняла людину без імені. Додай `NOT NULL` до `name`."
            },
            {
              label: "Людина без телефону",
              sql: "INSERT INTO people (name, age) VALUES ('Петро', 30)",
              why: "Таблиця прийняла людину без телефону. Додай `NOT NULL` до `phone`."
            },
            {
              label: "Двоє людей з одним телефоном",
              sql: "INSERT INTO people (name, phone, age) VALUES ('Іван', '050-1', 30); INSERT INTO people (name, phone, age) VALUES ('Іванна', '050-1', 31)",
              why: "Таблиця прийняла двох людей з одним телефоном. Додай `UNIQUE` до `phone`."
            },
            {
              label: "Заявник 15 років",
              sql: "INSERT INTO people (name, phone, age) VALUES ('Максим', '095-1', 15)",
              why: "Таблиця прийняла 15-річного. Додай `CHECK (age >= 18)`."
            },
            {
              label: "Заявниці рівно 18",
              sql: "INSERT INTO people (name, phone, age) VALUES ('Марія', '066-1', 18)",
              why: "18 років уже можна. Перевір знак: потрібно `>=`."
            }
          ],
          mustUse: ["CREATE TABLE"],
          hints: [
            "Можна писати кілька правил поспіль: `phone TEXT NOT NULL UNIQUE`.",
            "`CREATE TABLE people (id INTEGER PRIMARY KEY, name TEXT NOT NULL, phone TEXT NOT NULL UNIQUE, age INTEGER CHECK (age >= 18))`"
          ],
          starter: "CREATE TABLE people (\n  \n)",
          clue: "Таблиця `people` готова. Біт записав туди шістьох людей, які вже приходили по тварин."
        })
      ]
    },
    {
      id: "links",
      title: "Хто кого забрав",
      topics: "REFERENCES, JOIN",
      steps: [
        lesson({
          id: "lesson-links",
          title: "Урок: зовнішній ключ",
          story: [{ speaker: "robot", text: "Щоб записати, хто забрав тварину, потрібен зв'язок між таблицями `pets` і `people`." }],
          explain: [
            "Зовнішній ключ є стовпцем, який зберігає номер рядка з іншої таблиці. Його позначають словом `REFERENCES` і назвою таблиці з ключем у дужках.",
            "База перевіряє зв'язок: не можна записати номер тварини, якої немає в таблиці `pets`.",
            "Виконай приклад, а потім зміни номер власника на 5. Що скаже база?"
          ],
          why: "Запис про усиновлення має вказувати на справжню тварину і справжню людину. Зовнішній ключ не дасть записати тварину №77, якої немає, і не дасть видалити тварину, на яку є посилання.",
          instead: [
            { way: "`pet_name TEXT`", problem: "кличку можна написати з помилкою, а клички повторюються. Номер з ключа вказує точно на один рядок." },
            { way: "ім'я й телефон у `adoptions`", problem: "людина, яка взяла двох тварин, з'явиться двічі. Змінить телефон, і доведеться виправляти кілька рядків. Краще зберегти людину один раз у `people` і писати лише її номер." }
          ],
          syntax: "стовпець INTEGER REFERENCES таблиця(id)",
          notes: [
            { code: "REFERENCES owners(id)", text: "значення має бути серед `id` таблиці `owners`" },
            { code: "FOREIGN KEY (owner_id) REFERENCES owners(id)", text: "те саме, але окремим рядком у кінці" },
            { code: "FOREIGN KEY constraint failed", text: "так SQLite каже, що такого рядка немає" }
          ],
          example:
            "CREATE TABLE owners (id INTEGER PRIMARY KEY, name TEXT NOT NULL);\nCREATE TABLE toys (\n  id INTEGER PRIMARY KEY,\n  title TEXT,\n  owner_id INTEGER REFERENCES owners(id)\n);\nINSERT INTO owners (name) VALUES ('Оля');\nINSERT INTO toys (title, owner_id) VALUES ('м''ячик', 1);\nSELECT * FROM toys;"
        }),
        build({
          id: "create-adoptions",
          title: "Журнал усиновлень",
          story: [
            { speaker: "witness", text: "Коли людина забирає тварину, ми записуємо, хто, кого і коли. Одну тварину не можна віддати двічі, а одна людина може забрати кількох." },
            { speaker: "robot", text: "У таблиці `adoptions` будуть номери з `pets` і `people`. Зв'яжи їх зовнішніми ключами." }
          ],
          task: "Створи таблицю `adoptions`: `id` (ключ), `pet_id` (номер тварини з `pets`, не повторюється), `person_id` (номер людини з `people`) і `day` (дата, текст).",
          solution:
            "CREATE TABLE adoptions (\n  id INTEGER PRIMARY KEY,\n  pet_id INTEGER UNIQUE REFERENCES pets(id),\n  person_id INTEGER REFERENCES people(id),\n  day TEXT\n)",
          after: `INSERT INTO adoptions (pet_id, person_id, day) VALUES
  (2, 1, '2026-11-18'),
  (6, 3, '2026-11-19'),
  (8, 2, '2026-11-21'),
  (10, 5, '2026-11-22')`,
          tables: ["adoptions"],
          trials: [
            {
              label: "Оксана забирає Бублика",
              sql: "INSERT INTO adoptions (pet_id, person_id, day) VALUES (1, 1, '2026-11-20')",
              why: "Таблиця не прийняла правильний запис: тварина №1 і людина №1 існують."
            },
            {
              label: "Тварина №99, якої немає",
              sql: "INSERT INTO adoptions (pet_id, person_id, day) VALUES (99, 1, '2026-11-20')",
              why: "Таблиця прийняла тварину, якої немає. Додай `REFERENCES pets(id)` до `pet_id`."
            },
            {
              label: "Людина №42, якої немає",
              sql: "INSERT INTO adoptions (pet_id, person_id, day) VALUES (1, 42, '2026-11-20')",
              why: "Таблиця прийняла людину, якої немає. Додай `REFERENCES people(id)` до `person_id`."
            },
            {
              label: "Бублика забирають двічі",
              sql: "INSERT INTO adoptions (pet_id, person_id, day) VALUES (1, 1, '2026-11-20'); INSERT INTO adoptions (pet_id, person_id, day) VALUES (1, 2, '2026-11-21')",
              why: "Одну тварину віддали двічі. Додай `UNIQUE` до `pet_id`."
            },
            {
              label: "Тарас забирає двох тварин",
              sql: "INSERT INTO adoptions (pet_id, person_id, day) VALUES (3, 2, '2026-11-20'), (4, 2, '2026-11-20')",
              why: "Одна людина може забрати кількох тварин. `UNIQUE` потрібен лише для `pet_id`."
            }
          ],
          mustUse: ["REFERENCES"],
          hints: [
            "Зовнішній ключ: `pet_id INTEGER REFERENCES pets(id)`. Для тварини додай ще `UNIQUE`.",
            "`CREATE TABLE adoptions (id INTEGER PRIMARY KEY, pet_id INTEGER UNIQUE REFERENCES pets(id), person_id INTEGER REFERENCES people(id), day TEXT)`"
          ],
          starter: "CREATE TABLE adoptions (\n  \n)",
          clue: "Журнал усиновлень працює. Біт записав чотири тварини, які вже знайшли дім."
        }),
        build({
          id: "adopt-insert",
          title: "Ведмідь їде додому",
          story: [
            { speaker: "witness", text: "Щойно Андрій Лисенко забрав нашого великого пса Ведмедя! Запишіть, будь ласка: сьогодні, 27 листопада 2026 року." },
            { speaker: "robot", text: "Номери знайди запитами: Ведмідь у `pets`, Андрій у `people`. Дату пиши як текст `'2026-11-27'`." }
          ],
          task: "Додай у `adoptions` запис: Андрій Лисенко забрав Ведмедя 27 листопада 2026 року (`'2026-11-27'`).",
          solution: "INSERT INTO adoptions (pet_id, person_id, day) VALUES (11, 6, '2026-11-27')",
          tables: ["adoptions"],
          data: ["adoptions"],
          mustUse: ["INSERT"],
          hints: [
            "Знайди номери: `SELECT id FROM pets WHERE name = 'Ведмідь'` і `SELECT id FROM people WHERE name LIKE 'Андрій%'`.",
            "`INSERT INTO adoptions (pet_id, person_id, day) VALUES (11, 6, '2026-11-27')`"
          ],
          starter: "",
          clue: "Ведмідь (№11) поїхав додому з Андрієм (№6)."
        }),
        {
          kind: "query",
          id: "who-adopted",
          title: "Хто кого забрав",
          story: [{ speaker: "witness", text: "Покажіть мені, будь ласка, хто кого забрав. Номери я не пам'ятаю, мені потрібні клички й імена." }],
          task: "Покажи для кожного запису `adoptions` кличку тварини, ім'я людини і день.",
          solution: "SELECT p.name, h.name, a.day FROM adoptions a JOIN pets p ON p.id = a.pet_id JOIN people h ON h.id = a.person_id",
          ordered: false,
          mustUse: ["JOIN"],
          hints: [
            "З'єднай три таблиці: `adoptions` з `pets` за `pet_id` і з `people` за `person_id`.",
            "`SELECT p.name, h.name, a.day FROM adoptions a JOIN pets p ON p.id = a.pet_id JOIN people h ON h.id = a.person_id`"
          ],
          starter: "SELECT \nFROM adoptions a\nJOIN pets p ON p.id = a.pet_id\n",
          clue: "Рекс, Мурка, Пухнастик, Зефірка й Ведмідь уже вдома."
        }
      ]
    },
    {
      id: "change",
      title: "Зміни без руйнування",
      topics: "ALTER TABLE, UPDATE, DELETE",
      steps: [
        lesson({
          id: "lesson-alter",
          title: "Урок: ALTER TABLE",
          story: [{ speaker: "robot", text: "Тепер у таблицях справжні дані, тож видаляти їх через `DROP TABLE` не можна. Змінимо таблицю обережно." }],
          explain: [
            "`ALTER TABLE … ADD COLUMN` додає стовпець до таблиці з даними. Наявні рядки отримують значення `DEFAULT` або `NULL`.",
            "До того ж на `pets` посилається `adoptions`, тому база не дасть видалити `pets`, поки там є записи."
          ],
          why: "Таблиці живуть довго, а вимоги змінюються: ветеринар попросив новий стовпець. `ALTER TABLE` додає його і не чіпає записів, які вже є.",
          instead: [
            { way: "`DROP TABLE` і `CREATE TABLE`", problem: "так ми робили, поки таблиця була порожня. Тепер `DROP TABLE` знищить усі записи про тварин." },
            { way: "нова таблиця для щеплень", problem: "для однієї позначки «так» чи «ні» це зайве. Окрема таблиця потрібна, якщо зберігати багато щеплень з датами." }
          ],
          syntax: "ALTER TABLE таблиця ADD COLUMN стовпець ТИП",
          notes: [
            { code: "ALTER TABLE", text: "змінює таблицю" },
            { code: "ADD COLUMN", text: "додає стовпець" }
          ],
          example: "ALTER TABLE volunteers ADD COLUMN shift TEXT DEFAULT 'ранок';\nSELECT * FROM volunteers;"
        }),
        build({
          id: "add-vaccinated",
          title: "Позначка про щеплення",
          story: [{ speaker: "witness", text: "Приходив ветеринар. Він просить позначати, чи тварина щеплена: 1 — так, 0 — ні. Поки що не щеплений ніхто." }],
          task: "Додай до `pets` стовпець `vaccinated` (ціле число) зі значенням 0 за замовчуванням. Таблицю не видаляй.",
          solution: "ALTER TABLE pets ADD COLUMN vaccinated INTEGER DEFAULT 0",
          tables: ["pets"],
          data: ["pets"],
          trials: [
            {
              label: "Щеплення нової тварини",
              sql: "INSERT INTO pets (name, species) VALUES ('Ріжок', 'кіт'); SELECT vaccinated FROM pets WHERE name = 'Ріжок'",
              why: "Нова тварина має отримати `vaccinated` = 0. Додай `DEFAULT 0`."
            }
          ],
          mustUse: ["ALTER TABLE"],
          hints: ["`ALTER TABLE pets ADD COLUMN …`, далі назва, тип і `DEFAULT`.", "`ALTER TABLE pets ADD COLUMN vaccinated INTEGER DEFAULT 0`"],
          starter: "ALTER TABLE pets ",
          clue: "У `pets` з'явився стовпець `vaccinated`, і всі тварини поки мають 0."
        }),
        lesson({
          id: "lesson-update",
          title: "Урок: UPDATE",
          story: [{ speaker: "robot", text: "Дані змінюються: тварини знаходять дім, отримують щеплення. Для цього не треба видаляти рядок і писати його знову." }],
          explain: [
            "`UPDATE` змінює значення в рядках, які вже є. Після `SET` пишуть, що змінити, а `WHERE` вибирає рядки.",
            "Без `WHERE` зміняться всі рядки таблиці! Тому спершу перевір умову запитом `SELECT … WHERE`, а потім пиши `UPDATE` з тією самою умовою."
          ],
          why: "Факти змінюються: тварина знайшла дім, отримала щеплення. `UPDATE` змінює лише потрібне значення в рядку, а номер, кличка й зв'язки лишаються.",
          instead: [
            { way: "`DELETE` і новий `INSERT`", problem: "новий рядок отримає інший номер, і зв'язки в `adoptions` зламаються." },
            { way: "`UPDATE` без `WHERE`", problem: "змінить усі рядки таблиці. Спершу перевір умову через `SELECT`." }
          ],
          syntax: "UPDATE таблиця SET стовпець = значення WHERE умова",
          notes: [
            { code: "UPDATE", text: "змінює рядки" },
            { code: "SET a = 1, b = 'x'", text: "що саме змінити, можна кілька стовпців" },
            { code: "WHERE id IN (2, 6)", text: "які рядки змінити" }
          ],
          example: "UPDATE volunteers SET age = 23 WHERE name = 'Роман Зайченко';\nSELECT * FROM volunteers;"
        }),
        build({
          id: "update-status",
          title: "Вже вдома",
          story: [{ speaker: "witness", text: "Тварини, яких забрали, досі «шукають дім» у базі. Виправте, будь ласка." }],
          task: "Тваринам, які є в таблиці `adoptions`, постав статус «вдома».",
          solution: "UPDATE pets SET status = 'вдома' WHERE id IN (SELECT pet_id FROM adoptions)",
          tables: ["pets"],
          data: ["pets"],
          mustUse: ["UPDATE"],
          hints: [
            "Номери тварин подивись запитом `SELECT pet_id FROM adoptions`, а потім напиши їх у `WHERE id IN (…)`.",
            "`UPDATE pets SET status = 'вдома' WHERE id IN (2, 6, 8, 10, 11)`"
          ],
          starter: "UPDATE pets SET ",
          clue: "П'ять тварин мають статус «вдома»."
        }),
        build({
          id: "update-vaccinated",
          title: "Щеплення псів",
          story: [{ speaker: "witness", text: "Сьогодні ветеринар щепив усіх псів притулку, навіть тих, хто вже вдома." }],
          task: "Постав `vaccinated` = 1 усім тваринам виду «пес».",
          solution: "UPDATE pets SET vaccinated = 1 WHERE species = 'пес'",
          tables: ["pets"],
          data: ["pets"],
          mustUse: ["UPDATE", "WHERE"],
          hints: ["Умова за видом: `WHERE species = 'пес'`.", "`UPDATE pets SET vaccinated = 1 WHERE species = 'пес'`"],
          starter: "",
          clue: "Усі пси щеплені."
        }),
        lesson({
          id: "lesson-delete",
          title: "Урок: DELETE",
          story: [{ speaker: "robot", text: "Іноді рядок треба прибрати зовсім. Це робить `DELETE`, і він теж небезпечний без `WHERE`." }],
          explain: [
            "`DELETE FROM таблиця WHERE умова` видаляє рядки, для яких умова правдива. Таблиця залишається.",
            "`DELETE FROM таблиця` без `WHERE` видаляє всі рядки. Перевір умову через `SELECT`, перш ніж видаляти."
          ],
          why: "Деякі записи стають зайвими: кімнату закрили, людина більше не волонтер. `DELETE` прибирає лише вибрані рядки, а таблиця й решта даних лишаються.",
          instead: [
            { way: "`DROP TABLE`", problem: "видалить усю таблицю разом зі стовпцями, а не кілька рядків." },
            { way: "`UPDATE … SET name = NULL`", problem: "рядок залишиться й заважатиме в підрахунках. Якщо запис не потрібен, його видаляють." }
          ],
          syntax: "DELETE FROM таблиця WHERE умова",
          notes: [
            { code: "DELETE FROM", text: "видаляє рядки, таблиця лишається" },
            { code: "DROP TABLE", text: "видаляє всю таблицю" }
          ],
          example: "DELETE FROM cages WHERE id = 3;\nSELECT * FROM cages;"
        }),
        build({
          id: "delete-minors",
          title: "Лише дорослі волонтери",
          story: [
            { speaker: "witness", text: "Нове правило: волонтерами притулку бувають лише дорослі. Діти можуть приходити, але разом з батьками, і в журнал волонтерів їх не пишуть." }
          ],
          task: "Видали з таблиці `volunteers` усіх, кому менше 18 років.",
          solution: "DELETE FROM volunteers WHERE age < 18",
          tables: ["volunteers"],
          data: ["volunteers"],
          mustUse: ["DELETE", "WHERE"],
          hints: ["Спершу подивись, кого видалиш: `SELECT * FROM volunteers WHERE age < 18`.", "`DELETE FROM volunteers WHERE age < 18`"],
          starter: "",
          clue: "У журналі волонтерів троє дорослих."
        })
      ]
    },
    {
      id: "requests",
      title: "Фальшиві заявки",
      topics: "UNIQUE для пари, усе разом",
      steps: [
        lesson({
          id: "lesson-pair",
          title: "Урок: правило для пари стовпців",
          story: [{ speaker: "robot", text: "Останнє правило перед фіналом. Буває, що окремо значення можуть повторюватися, а разом ні." }],
          explain: [
            "Правило `UNIQUE (a, b)` пишуть окремим рядком у кінці списку стовпців. Воно забороняє повторити пару значень.",
            "Наприклад, `UNIQUE (pet_id, phone)`: одна людина може подати заявки на різних тварин, а на одну тварину можуть подати заявки різні люди. Але двічі ту саму пару не можна."
          ],
          why: "Одна людина може хотіти різних тварин, а на одну тварину можуть претендувати різні люди. Заборонити треба лише повтор пари «ця людина на цю тварину». Для цього правило ставлять на два стовпці разом.",
          instead: [
            { way: "`phone TEXT UNIQUE`", problem: "людина з таким телефоном зможе подати лише одну заявку на весь притулок." },
            { way: "`pet_id INTEGER UNIQUE`", problem: "на кожну тварину зможе подати заявку лише одна людина." }
          ],
          syntax: "CREATE TABLE таблиця (\n  …,\n  UNIQUE (стовпець1, стовпець2)\n)",
          notes: [
            { code: "UNIQUE (a, b)", text: "пара значень не повторюється" },
            { code: "CHECK (…)", text: "так само можна писати й умову для кількох стовпців" }
          ],
          example:
            "CREATE TABLE likes (\n  pet_id INTEGER,\n  phone TEXT,\n  UNIQUE (pet_id, phone)\n);\nINSERT INTO likes VALUES (1, '050'), (2, '050'), (1, '067');\nSELECT * FROM likes;"
        }),
        build({
          id: "create-requests",
          title: "Прийом заявок",
          story: [
            {
              speaker: "witness",
              text: "Відколи ми розмістили фото тварин в інтернеті, приходять заявки. Деякі з них дивні: на тварин, яких у нас немає, від дітей, і по кілька разів на одну тварину."
            },
            {
              speaker: "robot",
              text: "Збудуй таблицю `requests` з усіма правилами. Потім я пропущу через неї сім заявок і покажу, які вона відхилить. Подивись на них уважно."
            }
          ],
          task: "Створи таблицю `requests`: `id` (ключ), `pet_id` (обов'язковий номер тварини з `pets`), `name` і `phone` (обов'язкові), `age` (не менше 18). Одна людина (телефон) може подати лише одну заявку на ту саму тварину.",
          solution:
            "CREATE TABLE requests (\n  id INTEGER PRIMARY KEY,\n  pet_id INTEGER NOT NULL REFERENCES pets(id),\n  name TEXT NOT NULL,\n  phone TEXT NOT NULL,\n  age INTEGER CHECK (age >= 18),\n  UNIQUE (pet_id, phone)\n)",
          tables: ["requests"],
          trials: [
            request("Наталія, тел. 068-150-15-15, на Тайсона", "(7, 'Наталія', '068-150-15-15', 45)", "Справжня заявка: Тайсон є в `pets`, Наталії 45 років."),
            request("Богдан, тел. 095-222-30-30, на Хмаринку", "(3, 'Богдан', '095-222-30-30', 30)", "Справжня заявка: Хмаринка є в `pets`, Богданові 30 років."),
            request(
              `«Максим», тел. ${CULPRIT_PHONE}, на тварину №77`,
              `(77, 'Максим', '${CULPRIT_PHONE}', 25)`,
              "Тварини №77 немає. Додай `REFERENCES pets(id)` до `pet_id`."
            ),
            request(
              `«Софія», тел. ${CULPRIT_PHONE}, 15 років, на Грома`,
              `(9, 'Софія', '${CULPRIT_PHONE}', 15)`,
              "Заявниці 15 років. Додай `CHECK (age >= 18)`."
            ),
            request(
              `Двічі «Денис», тел. ${CULPRIT_PHONE}, на Луну`,
              `(4, 'Денис', '${CULPRIT_PHONE}', 33); INSERT INTO requests (pet_id, name, phone, age) VALUES (4, 'Денис М.', '${CULPRIT_PHONE}', 33)`,
              "Один телефон подав дві заявки на одну тварину. Додай у кінці `UNIQUE (pet_id, phone)`."
            ),
            request(
              `«Ігор», тел. ${CULPRIT_PHONE}, без тварини`,
              `(NULL, 'Ігор', '${CULPRIT_PHONE}', 40)`,
              "Заявка без тварини. Додай `NOT NULL` до `pet_id`."
            ),
            request(
              "Ярослав, тел. 067-777-00-11, теж на Тайсона",
              "(7, 'Наталія', '068-150-15-15', 45); INSERT INTO requests (pet_id, name, phone, age) VALUES (7, 'Ярослав', '067-777-00-11', 27)",
              "Різні люди можуть подати заявки на одну тварину. Правило `UNIQUE` має бути на парі `(pet_id, phone)`, а не лише на `pet_id`."
            )
          ],
          mustUse: ["REFERENCES"],
          hints: [
            "Правило для пари пишуть окремим рядком у кінці: `UNIQUE (pet_id, phone)`. Перед ним стоїть кома.",
            "`CREATE TABLE requests (id INTEGER PRIMARY KEY, pet_id INTEGER NOT NULL REFERENCES pets(id), name TEXT NOT NULL, phone TEXT NOT NULL, age INTEGER CHECK (age >= 18), UNIQUE (pet_id, phone))`"
          ],
          starter: "CREATE TABLE requests (\n  \n)",
          clue: `Таблиця відхилила чотири заявки. У всіх один і той самий телефон: ${CULPRIT_PHONE}.`
        }),
        {
          kind: "answer",
          id: "culprit",
          title: "Чий це телефон?",
          story: [
            {
              speaker: "robot",
              text: `Фальшиві заявки підписано різними іменами, але телефон завжди ${CULPRIT_PHONE}. Пошукай його в таблицях бази.`
            }
          ],
          question: "Хто надсилав фальшиві заявки? Напиши ім'я та прізвище.",
          accepted: ["Віктор Гаврилюк", "Гаврилюк Віктор"],
          hints: ["Подивись телефони в таблицях `people` і `volunteers`.", `\`SELECT * FROM volunteers WHERE phone = '${CULPRIT_PHONE}'\``],
          clue: "Заявки надсилав Віктор Гаврилюк, волонтер притулку."
        }
      ]
    }
  ],
  ending: [
    {
      speaker: "narrator",
      text: "Віктор зізнався: він хотів забрати породистих Луну й Грома, щоб продати їх. Пані Галина подякувала йому за допомогу раніше, але більше не пускає його до тварин."
    },
    {
      speaker: "robot",
      text: "Справу розкрито! Жодна тварина не потрапила до перекупника, бо правила твоїх таблиць самі відхилили фальшиві заявки. Ти збудував базу з нуля: `CREATE TABLE`, `INSERT`, `PRIMARY KEY`, `NOT NULL`, `DEFAULT`, `UNIQUE`, `CHECK`, `REFERENCES`, `ALTER TABLE`, `UPDATE` і `DELETE`."
    }
  ]
}
