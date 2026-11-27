import type { BuildStep, Case, Trial } from "../types.ts"

/**
 * Case 3, «Справа про загублені лапи»: the student builds the database of an animal shelter with
 * `CREATE TABLE`, `INSERT`, keys and rules. At the end the rules of the student's tables refuse forged
 * adoption requests, and the phone number in them shows who sent them.
 */

/** The wet paper journal of the shelter. Lines 4, 7, 8 and 12 break the rules of chapter 4. */
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

const PETS_V1 = "CREATE TABLE pets (\n  id INTEGER,\n  name TEXT,\n  species TEXT,\n  age INTEGER,\n  weight REAL\n)"
const PETS_KEY = "CREATE TABLE pets (\n  id INTEGER PRIMARY KEY,\n  name TEXT,\n  species TEXT,\n  age INTEGER,\n  weight REAL\n)"
const PETS_NAME =
  "CREATE TABLE pets (\n  id INTEGER PRIMARY KEY,\n  name TEXT NOT NULL,\n  species TEXT,\n  age INTEGER,\n  weight REAL,\n  status TEXT DEFAULT 'шукає дім'\n)"
const PETS_CHIP =
  "CREATE TABLE pets (\n  id INTEGER PRIMARY KEY,\n  name TEXT NOT NULL,\n  species TEXT,\n  age INTEGER,\n  weight REAL,\n  status TEXT DEFAULT 'шукає дім',\n  chip TEXT UNIQUE\n)"
const PETS_CHECK =
  "CREATE TABLE pets (\n  id INTEGER PRIMARY KEY,\n  name TEXT NOT NULL,\n  species TEXT CHECK (species IN ('кіт', 'пес', 'кролик')),\n  age INTEGER CHECK (age >= 0),\n  weight REAL,\n  status TEXT DEFAULT 'шукає дім',\n  chip TEXT UNIQUE\n)"

const NO_NAME: Trial = {
  label: "Тварина без клички",
  sql: "INSERT INTO pets (species, age) VALUES ('пес', 3)",
  why: "Таблиця прийняла тварину без клички. Додай `NOT NULL` до стовпця `name`."
}

const SAME_CHIP: Trial = {
  label: "Однаковий чип у двох тварин",
  sql: "INSERT INTO pets (name, species, chip) VALUES ('Мурка', 'кіт', 'UA-7'); INSERT INTO pets (name, species, chip) VALUES ('Барсик', 'кіт', 'UA-7')",
  why: "Таблиця прийняла двох тварин з одним номером чипа. Додай `UNIQUE` до стовпця `chip`."
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
    "Ліцей допомагає притулку «Лапа». Паперовий журнал тварин намок під дощем, і робот Біт пропонує збудувати базу даних з нуля. Створюй таблиці, додавай записи й правила, а в кінці з'ясуй, хто надсилає фальшиві заявки на тварин.",
  grades: "8–11",
  file: "притулок.db",
  chips: ["CREATE TABLE", "INTEGER", "TEXT", "REAL", "PRIMARY KEY", "NOT NULL", "DEFAULT", "UNIQUE", "CHECK", "REFERENCES", "INSERT INTO", "VALUES", "DROP TABLE", "ALTER TABLE", "UPDATE", "''"],
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
        {
          kind: "lesson",
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
            "Таблицю створює команда `CREATE TABLE`. Після неї пишуть назву таблиці, а в дужках через кому перелічують стовпці.",
            "Кожен стовпець має назву і тип. Тип каже, що в стовпці зберігається: ціле число, дробове число чи текст.",
            "Назви таблиць і стовпців пишуть латинськими літерами без пробілів, наприклад `pets` або `birth_year`. Команду `INSERT` з прикладу розберемо в наступному розділі."
          ],
          syntax: "CREATE TABLE таблиця (\n  стовпець1 ТИП,\n  стовпець2 ТИП\n)",
          notes: [
            { code: "CREATE TABLE", text: "створює нову таблицю" },
            { code: "INTEGER", text: "ціле число: вік, кількість, номер" },
            { code: "REAL", text: "дробове число: вага, ціна" },
            { code: "TEXT", text: "текст: кличка, телефон, дата" },
            { code: ",", text: "розділяє стовпці; після останнього коми немає" }
          ],
          example: "CREATE TABLE toys (\n  id INTEGER,\n  title TEXT,\n  price REAL\n);\nINSERT INTO toys VALUES (1, 'м''ячик', 45.5);\nSELECT * FROM toys;"
        },
        build({
          id: "create-pets",
          title: "Таблиця тварин",
          story: [
            {
              speaker: "witness",
              text: "Я пані Галина, керівниця притулку. Про кожну тварину ми записуємо номер, кличку, вид, вік і вагу. Допоможіть зробити це в комп'ютері!"
            },
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
        })
      ]
    },
    {
      id: "insert",
      title: "Перші мешканці",
      topics: "INSERT INTO, VALUES, NULL",
      steps: [
        {
          kind: "lesson",
          id: "lesson-insert",
          title: "Урок: INSERT INTO",
          story: [{ speaker: "robot", text: "Таблиця без рядків схожа на порожню шафу. Додамо записи." }],
          explain: [
            "Рядок додає команда `INSERT INTO`. Після назви таблиці пишуть `VALUES`, а в дужках перелічують значення в тому самому порядку, що й стовпці.",
            "Текст беруть в одинарні лапки: `'Бублик'`. Числа пишуть без лапок, а дробову частину відділяють крапкою: `4.1`.",
            "Одна команда може додати кілька рядків: дужки з рядками розділяють комою.",
            "Якщо значення невідоме, пишуть `NULL`. Або після назви таблиці в дужках перелічують лише ті стовпці, які заповнюють: решта отримає `NULL`."
          ],
          syntax: "INSERT INTO таблиця (стовпець1, стовпець2)\nVALUES (значення1, значення2), (…)",
          notes: [
            { code: "INSERT INTO", text: "додає рядки в таблицю" },
            { code: "VALUES", text: "значення нових рядків" },
            { code: "'текст'", text: "текст завжди в одинарних лапках" },
            { code: "NULL", text: "значення невідоме" }
          ],
          example: "INSERT INTO pets VALUES (100, 'Тестик', 'кіт', 1, 3.0);\nSELECT * FROM pets;"
        },
        build({
          id: "insert-cards",
          title: "Три картки",
          story: [
            { speaker: "witness", text: "Ось три картки, які вціліли:" },
            { speaker: "narrator", text: "№1 — Бублик, кіт, 2 роки, 4.1 кг. №2 — Рекс, пес, 5 років, 23.5 кг. №3 — Хмаринка, кролик, 1 рік, 1.8 кг." },
            { speaker: "robot", text: "Першу картку я вже переписав у редактор. Додай ще дві в ту саму команду." }
          ],
          task: "Додай у таблицю `pets` усі три картки.",
          solution: "INSERT INTO pets VALUES\n  (1, 'Бублик', 'кіт', 2, 4.1),\n  (2, 'Рекс', 'пес', 5, 23.5),\n  (3, 'Хмаринка', 'кролик', 1, 1.8)",
          tables: ["pets"],
          data: ["pets"],
          mustUse: ["INSERT"],
          hints: [
            "Після дужки Бублика постав кому і допиши `(2, 'Рекс', 'пес', 5, 23.5)`.",
            "Третій рядок: `(3, 'Хмаринка', 'кролик', 1, 1.8)`. Наприкінці може стояти крапка з комою."
          ],
          starter: "INSERT INTO pets VALUES\n  (1, 'Бублик', 'кіт', 2, 4.1)",
          clue: "У базі вже три тварини: Бублик, Рекс і Хмаринка."
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
        })
      ]
    },
    {
      id: "key",
      title: "Номер на нашийнику",
      topics: "PRIMARY KEY, DROP TABLE",
      steps: [
        {
          kind: "lesson",
          id: "lesson-key",
          title: "Урок: PRIMARY KEY",
          story: [{ speaker: "robot", text: "Номери ми досі вигадували самі. Так легко помилитися." }],
          explain: [
            "Первинний ключ (`PRIMARY KEY`) є стовпцем, за яким кожен рядок можна знайти точно. Два рядки не можуть мати однаковий ключ.",
            "Якщо написати `id INTEGER PRIMARY KEY`, SQLite сам дає новому рядку наступний номер. Номер у `INSERT` тоді можна не писати.",
            "Таблицю, яку вже створено, не можна створити ще раз. Стару таблицю видаляє `DROP TABLE` разом з усіма її рядками."
          ],
          syntax: "CREATE TABLE таблиця (\n  id INTEGER PRIMARY KEY,\n  …\n)",
          notes: [
            { code: "PRIMARY KEY", text: "первинний ключ: значення не повторюються" },
            { code: "INTEGER PRIMARY KEY", text: "номер, який SQLite дає сам" },
            { code: "DROP TABLE", text: "видаляє таблицю з усіма рядками" }
          ],
          example: "CREATE TABLE toys (\n  id INTEGER PRIMARY KEY,\n  title TEXT\n);\nINSERT INTO toys (title) VALUES ('м''ячик'), ('кістка');\nSELECT * FROM toys;"
        },
        build({
          id: "key-pets",
          title: "Ключ для тварин",
          story: [
            { speaker: "witness", text: "Біда! Двоє волонтерів одночасно записали нових котів, і обидва дали їм номер 7." },
            {
              speaker: "robot",
              text: "Перебудуємо `pets`, щоб номер давався сам і не міг повторитися. Записи з карток я збережу, а таблицю видали й створи знову."
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
        })
      ]
    },
    {
      id: "rules",
      title: "Правила притулку",
      topics: "NOT NULL, DEFAULT, UNIQUE, CHECK",
      steps: [
        {
          kind: "lesson",
          id: "lesson-rules",
          title: "Урок: правила для стовпців",
          story: [{ speaker: "robot", text: "Хороша таблиця сама не пускає неправильні записи. Для цього в SQL є правила, або обмеження." }],
          explain: [
            "Правило пишуть після типу стовпця. Якщо запис порушує правило, база не додає його і показує помилку.",
            "`NOT NULL` забороняє порожнє значення. `UNIQUE` забороняє два однакові значення в стовпці, але кілька `NULL` дозволяє.",
            "`CHECK (умова)` пропускає лише ті значення, для яких умова правдива. `DEFAULT` задає значення, яке стовпець отримує, якщо в `INSERT` його не вказали."
          ],
          syntax: "стовпець ТИП NOT NULL\nстовпець ТИП UNIQUE\nстовпець ТИП CHECK (умова)\nстовпець ТИП DEFAULT значення",
          notes: [
            { code: "NOT NULL", text: "значення обов'язкове" },
            { code: "UNIQUE", text: "значення не повторюються" },
            { code: "CHECK (price > 0)", text: "значення має задовольняти умову" },
            { code: "DEFAULT 'на складі'", text: "значення, якщо його не вказали" },
            { code: "IN ('a', 'b')", text: "одне зі значень у списку" }
          ],
          example:
            "CREATE TABLE toys (\n  id INTEGER PRIMARY KEY,\n  title TEXT NOT NULL,\n  code TEXT UNIQUE,\n  price REAL CHECK (price > 0),\n  state TEXT DEFAULT 'на складі'\n);\nINSERT INTO toys (title, code, price) VALUES ('м''ячик', 'T-1', 45);\nSELECT * FROM toys;"
        },
        build({
          id: "rule-name",
          title: "Кличка і статус",
          story: [
            { speaker: "witness", text: "Тварина без клички в журналі — це безлад. А кожна нова тварина в нас спершу «шукає дім»." },
            { speaker: "robot", text: "Я вставив у редактор нашу таблицю. Додай правило для клички і новий стовпець `status`." }
          ],
          task: "Перестав таблицю `pets`: кличка `name` обов'язкова, а новий текстовий стовпець `status` має значення «шукає дім», якщо його не вказали.",
          solution: `DROP TABLE pets;\n${PETS_NAME}`,
          tables: ["pets"],
          trials: [
            {
              label: "Звичайний кіт Бублик",
              sql: "INSERT INTO pets (name, species, age, weight) VALUES ('Бублик', 'кіт', 2, 4.1)",
              why: "Таблиця не прийняла звичайного кота. Мабуть, якесь правило зайве."
            },
            {
              label: "Статус нової тварини",
              sql: "INSERT INTO pets (name, species) VALUES ('Бублик', 'кіт'); SELECT status FROM pets",
              why: "Статус нової тварини має бути «шукає дім». Додай `DEFAULT 'шукає дім'` до стовпця `status`."
            },
            NO_NAME,
            {
              label: "Кличка NULL",
              sql: "INSERT INTO pets (name, species) VALUES (NULL, 'кіт')",
              why: "Таблиця прийняла `NULL` замість клички. Додай `NOT NULL` до стовпця `name`."
            }
          ],
          mustUse: ["NOT NULL", "DEFAULT"],
          hints: [
            "Допиши `NOT NULL` після `name TEXT`. Новий стовпець: `status TEXT DEFAULT …`, текст в одинарних лапках.",
            "`name TEXT NOT NULL,` і в кінці `status TEXT DEFAULT 'шукає дім'`"
          ],
          starter: `DROP TABLE pets;\n${PETS_KEY}`,
          clue: "Без клички тварину не записати, а нова тварина одразу «шукає дім»."
        }),
        build({
          id: "rule-chip",
          title: "Номер чипа",
          story: [
            { speaker: "witness", text: "Багатьом тваринам вшито чип з номером. Номер у кожного чипа свій. Але є тварини й без чипа." },
            { speaker: "robot", text: "Додамо стовпець `chip`. Подумай, яке правило не дасть повторити номер." }
          ],
          task: "Додай до `pets` текстовий стовпець `chip`, у якому номери не можуть повторюватися. Правила попереднього кроку залиш.",
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
          starter: `DROP TABLE pets;\n${PETS_NAME}`,
          clue: "Два однакові чипи тепер неможливі, а тварини без чипа приймаються."
        }),
        build({
          id: "rule-check",
          title: "Перевірка віку й виду",
          story: [
            { speaker: "witness", text: "У старому журналі є пес з віком «−4» і навіть папуга. Але папуг ми не беремо: у нас лише коти, пси й кролики." },
            { speaker: "robot", text: "Правило `CHECK` перевіряє значення умовою. Невідомий вік (`NULL`) правило пропускає, і це добре." }
          ],
          task: "Додай до `pets` два правила: вік `age` не може бути від'ємним, а вид `species` може бути лише «кіт», «пес» або «кролик».",
          solution: `DROP TABLE pets;\n${PETS_CHECK}`,
          after:
            "INSERT INTO pets (name, species, age, weight, chip)\n  SELECT name, species, age, weight, chip FROM old_journal WHERE line NOT IN (4, 7, 8, 12) ORDER BY line",
          tables: ["pets"],
          trials: [
            {
              label: "Пес Шарик, вік −4",
              sql: "INSERT INTO pets (name, species, age) VALUES ('Шарик', 'пес', -4)",
              why: "Таблиця прийняла від'ємний вік. Додай `CHECK (age >= 0)`."
            },
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
            SAME_CHIP
          ],
          mustUse: ["CHECK"],
          hints: [
            "Правило пишуть після типу: `age INTEGER CHECK (…)`. Для виду підійде `IN (…)` зі списком у лапках.",
            "`age INTEGER CHECK (age >= 0)` і `species TEXT CHECK (species IN ('кіт', 'пес', 'кролик'))`"
          ],
          starter: `DROP TABLE pets;\n${PETS_CHIP}`,
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
        }
      ]
    },
    {
      id: "links",
      title: "Хто кого забрав",
      topics: "REFERENCES, зовнішній ключ, JOIN",
      steps: [
        {
          kind: "lesson",
          id: "lesson-links",
          title: "Урок: зовнішній ключ",
          story: [{ speaker: "robot", text: "Щоб записати, хто забрав тварину, потрібні дві таблиці і зв'язок між ними." }],
          explain: [
            "Зовнішній ключ є стовпцем, який зберігає номер рядка з іншої таблиці. Його позначають словом `REFERENCES` і назвою таблиці з ключем у дужках.",
            "База перевіряє зв'язок: не можна записати номер тварини, якої немає в таблиці `pets`.",
            "Правило `UNIQUE (a, b)` у кінці списку стовпців забороняє повторити пару значень, хоча кожне значення окремо може повторюватися."
          ],
          syntax: "стовпець INTEGER REFERENCES таблиця(id)",
          notes: [
            { code: "REFERENCES owners(id)", text: "значення має бути серед `id` таблиці `owners`" },
            { code: "FOREIGN KEY (owner_id) REFERENCES owners(id)", text: "те саме, але окремим рядком у кінці" },
            { code: "UNIQUE (a, b)", text: "пара значень не повторюється" }
          ],
          example:
            "CREATE TABLE owners (id INTEGER PRIMARY KEY, name TEXT NOT NULL);\nCREATE TABLE toys (\n  id INTEGER PRIMARY KEY,\n  title TEXT,\n  owner_id INTEGER REFERENCES owners(id)\n);\nINSERT INTO owners (name) VALUES ('Оля');\nINSERT INTO toys (title, owner_id) VALUES ('м''ячик', 1);\nSELECT * FROM toys;"
        },
        build({
          id: "create-people",
          title: "Люди, які беруть тварин",
          story: [
            { speaker: "witness", text: "Тварину віддаємо лише дорослим, від 18 років. Ім'я й телефон обов'язкові, і на один телефон записуємо одну людину." },
            { speaker: "robot", text: "Усе, що ти вже знаєш, в одній таблиці. Ключ `id` дай такий самий, як у `pets`." }
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
          clue: "Рекс, Мурка, Пухнастик і Зефірка вже вдома."
        }
      ]
    },
    {
      id: "change",
      title: "Зміни без руйнування",
      topics: "ALTER TABLE, UPDATE",
      steps: [
        {
          kind: "lesson",
          id: "lesson-alter",
          title: "Урок: ALTER TABLE і UPDATE",
          story: [{ speaker: "robot", text: "Тепер у таблицях справжні дані, тож видаляти їх через `DROP TABLE` не можна. Змінимо таблицю обережно." }],
          explain: [
            "`ALTER TABLE … ADD COLUMN` додає стовпець до таблиці з даними. Наявні рядки отримують значення `DEFAULT` або `NULL`.",
            "`UPDATE` змінює значення в рядках. Після `SET` пишуть, що змінити, а `WHERE` вибирає рядки. Без `WHERE` зміняться всі рядки!"
          ],
          syntax: "ALTER TABLE таблиця ADD COLUMN стовпець ТИП;\nUPDATE таблиця SET стовпець = значення WHERE умова",
          notes: [
            { code: "ALTER TABLE", text: "змінює таблицю" },
            { code: "ADD COLUMN", text: "додає стовпець" },
            { code: "UPDATE", text: "змінює рядки" },
            { code: "SET", text: "що саме змінити" },
            { code: "WHERE id IN (2, 6)", text: "які рядки змінити" }
          ],
          example: "ALTER TABLE volunteers ADD COLUMN shift TEXT DEFAULT 'ранок';\nUPDATE volunteers SET shift = 'вечір' WHERE id = 2;\nSELECT * FROM volunteers;"
        },
        build({
          id: "vet-update",
          title: "Візит ветеринара",
          story: [
            { speaker: "witness", text: "Приходив ветеринар. Він просить позначати, чи тварина щеплена. А ще тварини, яких забрали, досі «шукають дім»." },
            { speaker: "robot", text: "Не видаляй `pets`: на неї посилається `adoptions`. Додай стовпець і зміни статус." }
          ],
          task: "Додай до `pets` стовпець `vaccinated` (ціле число, за замовчуванням 0). Потім тваринам, які є в `adoptions`, постав статус «вдома».",
          solution: "ALTER TABLE pets ADD COLUMN vaccinated INTEGER DEFAULT 0;\nUPDATE pets SET status = 'вдома' WHERE id IN (SELECT pet_id FROM adoptions)",
          tables: ["pets"],
          data: ["pets"],
          trials: [
            {
              label: "Щеплення нової тварини",
              sql: "INSERT INTO pets (name, species) VALUES ('Ріжок', 'кіт'); SELECT vaccinated FROM pets WHERE name = 'Ріжок'",
              why: "Нова тварина має отримати `vaccinated` = 0. Додай `DEFAULT 0`."
            }
          ],
          mustUse: ["ALTER TABLE", "UPDATE"],
          hints: [
            "Номери тварин, яких забрали, подивись запитом `SELECT pet_id FROM adoptions`.",
            "`ALTER TABLE pets ADD COLUMN vaccinated INTEGER DEFAULT 0; UPDATE pets SET status = 'вдома' WHERE id IN (2, 6, 8, 10)`"
          ],
          starter: "",
          clue: "У `pets` з'явився стовпець `vaccinated`, а чотири тварини мають статус «вдома»."
        })
      ]
    },
    {
      id: "requests",
      title: "Фальшиві заявки",
      topics: "усе разом: ключі й правила",
      steps: [
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
            request("Богдан, тел. 095-222-30-30, на Ведмедя", "(11, 'Богдан', '095-222-30-30', 30)", "Справжня заявка: Ведмідь є в `pets`, Богданові 30 років."),
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
      text: "Справу розкрито! Жодна тварина не потрапила до перекупника, бо правила твоїх таблиць самі відхилили фальшиві заявки. Ти збудував базу з нуля: `CREATE TABLE`, `INSERT`, `PRIMARY KEY`, `NOT NULL`, `UNIQUE`, `CHECK`, `REFERENCES` і `ALTER TABLE`."
    }
  ]
}
