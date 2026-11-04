"""Generates the database of the case "Справа про фальшиве голосування" and checks the facts of the story.

Usage: python3 scripts/fake-votes-db.py setup.sql, then paste setup.sql into src/core/cases/fake-votes.ts.
"""
import random, sqlite3, sys
R = random.Random(20261109)

FIRST_M = ["Андрій","Богдан","Владислав","Денис","Євген","Іван","Кирило","Максим","Матвій","Микола","Остап","Павло","Роман","Святослав","Тарас","Тимофій","Юрій","Ярослав","Данило","Ілля","Захар","Марко","Петро","Степан"]
FIRST_F = ["Анна","Валерія","Дарина","Діана","Єва","Катерина","Злата","Ірина","Мирослава","Марта","Олеся","Поліна","Христина","Юлія","Яна","Аліна","Вероніка","Ганна","Емілія","Оксана","Соломія","Таїсія","Ангеліна","Уляна"]
LAST = ["Бондаренко","Ковальчук","Шевченко","Кравченко","Олійник","Ткаченко","Савченко","Литвиненко","Мороз","Поліщук","Марченко","Лисенко","Петренко","Захарченко","Вовк","Гончар","Демченко","Карпенко","Левченко","Мазур","Онищенко","Павленко","Романенко","Семенюк","Тимошенко","Федоренко","Хоменко","Чорновол","Юрченко","Яковенко","Білик","Гаврилюк","Дяченко","Зінченко","Климчук","Лук'яненко","Нестеренко","Остапчук","Пилипенко","Стасюк"]
CLASSES = ["9-А","9-Б","10-А","10-Б","11-А","11-Б"]

N_REAL = 140
users = {}  # id -> (first, last, class, day, time)
SPECIAL = {12: ("Софія","Мельник","10-А"), 27: ("Назар","Гнатюк","10-А"), 33: ("Ліза","Кравець","10-А"),
           45: ("Артем","Бойко","11-Б"), 58: ("Олександр","Руденко","11-Б"), 61: ("Вікторія","Шульга","11-Б")}
used = set((f, l) for f, l, _ in SPECIAL.values())
for uid in range(1, N_REAL + 1):
    if uid in SPECIAL:
        f, l, c = SPECIAL[uid]
    else:
        while True:
            f = R.choice(FIRST_M + FIRST_F); l = R.choice(LAST)
            if (f, l) not in used: break
        used.add((f, l)); c = CLASSES[(uid * 7) % len(CLASSES)]
    users[uid] = (f, l, c, f"2026-09-{R.randint(1, 15):02d}", f"{R.randint(8, 17):02d}:{R.randint(0, 59):02d}")
N_GHOST = 37
for k in range(N_GHOST):
    uid = N_REAL + 1 + k
    users[uid] = ("Фанат", f"Теплиці {k + 1:02d}", None, "2026-11-07", f"01:{50 + k * 20 // N_GHOST:02d}" if 50 + k * 20 // N_GHOST < 60 else f"02:{(50 + k * 20 // N_GHOST) - 60:02d}")

projects = [(1,"Розумна теплиця","екологія"),(2,"Еко-дрон","екологія"),(3,"Шкільний метеозонд","наука"),(4,"Бот-розклад","програмування"),
            (5,"Сонячна зарядка","енергетика"),(6,"Музей у телефоні","історія"),(7,"Розумний смітник","екологія"),(8,"Подкаст «Історія міста»","медіа")]
# Teams: the special characters first.
teams = {1: [12, 27, 33], 2: [45, 58, 61]}
pool = [u for u in range(1, N_REAL + 1) if u not in SPECIAL]
R.shuffle(pool)
for pid in range(3, 9):
    teams[pid] = [pool.pop() for _ in range(3 + (pid % 2))]
team_rows = []
for pid, members in teams.items():
    for i, u in enumerate(members):
        team_rows.append((pid, u, "капітан" if i == 0 else "учасник"))

# Devices: a phone of every real student, 10 computers in room 305, 8 laptops for loans.
devices = []
phone = {}
for uid in range(1, N_REAL + 1):
    did = len(devices) + 1; devices.append((did, f"Телефон {did:03d}", "телефон", None)); phone[uid] = did
comp = {}
for n in range(1, 11):
    did = len(devices) + 1; devices.append((did, f"Комп'ютер 305-{n:02d}", "комп'ютер", "305")); comp[n] = did
laptop = {}
for n in range(1, 9):
    did = len(devices) + 1; devices.append((did, f"Ноутбук-{n:02d}", "ноутбук", "305")); laptop[n] = did

DAYS = ["2026-11-02","2026-11-03","2026-11-04","2026-11-05","2026-11-06","2026-11-07","2026-11-08"]
logins = []
def login(u, d, day, t): logins.append((len(logins) + 1, u, d, day, t))

# Honest votes: distinct voters per project.
TARGET = {1: 79, 2: 74, 3: 61, 4: 48, 5: 40, 6: 33, 7: 27, 8: 19}
choice = {u: set() for u in range(1, N_REAL + 1)}
for pid, members in teams.items():
    for u in members: choice[u].add(pid)  # a team votes for itself
choice[27] = {1}           # Назар: one vote
choice[58] = {2}           # Олександр: only his team
for pid in sorted(TARGET):
    need = TARGET[pid] - sum(1 for u in choice if pid in choice[u])
    cands = [u for u in choice if pid not in choice[u] and len(choice[u]) < 3 and u not in (27, 58)]
    R.shuffle(cands)
    cands.sort(key=lambda u: len(choice[u]))  # students without a vote first
    for u in cands[:need]: choice[u].add(pid)
assert all(choice[u] for u in choice), [u for u in choice if not choice[u]]
assert all(sum(1 for u in choice if pid in choice[u]) == TARGET[pid] for pid in TARGET), [sum(1 for u in choice if p in choice[u]) for p in TARGET]

votes = []
def vote(u, pid, d, day, t): votes.append((len(votes) + 1, u, pid, d, day, t))
# Who votes on which school computer: fixed counts so the top of the device list is clear.
COMP_USERS = {3: 14, 5: 11, 1: 9, 2: 7, 4: 6, 6: 5, 7: 4, 8: 3, 9: 2, 10: 2}
on_comp = {}
eligible = [u for u in range(1, N_REAL + 1) if u not in (12, 27, 58)]
R.shuffle(eligible)
for n, k in COMP_USERS.items():
    for _ in range(k): on_comp[eligible.pop()] = n
SOFIA_DAYS = DAYS[:5] + ["2026-11-08"]
for u in range(1, N_REAL + 1):
    days = SOFIA_DAYS if u == 12 else DAYS
    for pid in sorted(choice[u]):
        if u == 27:
            day, t = "2026-11-06", "23:40"
        else:
            day = R.choice(days[:-1] if u != 12 else ["2026-11-03", "2026-11-05"])
            t = f"{R.randint(8, 21):02d}:{R.randint(0, 59):02d}"
        if u in on_comp and R.random() < 0.6 and day not in ("2026-11-07", "2026-11-08") and t < "15:00":
            d = comp[on_comp[u]]
        else:
            d = phone[u]
        h, m = int(t[:2]), int(t[3:])
        lt = f"{h:02d}:{max(0, m - 5):02d}" if m >= 5 else f"{max(0, h - 1):02d}:55"
        login(u, d, day, lt)
        vote(u, pid, d, day, t)
# Extra honest logins without votes.
for u in range(1, N_REAL + 1):
    if u in (12, 58): continue
    for _ in range(R.randint(0, 1)):
        login(u, phone[u], R.choice(DAYS[:5]), f"{R.randint(7, 20):02d}:{R.randint(0, 59):02d}")
# Sofia: Friday afternoon, then Sunday evening (an excursion on Saturday).
login(12, phone[12], "2026-11-06", "16:10")
login(12, phone[12], "2026-11-08", "20:30")
# Олександр: his phone during the week; the laptop at 01:47 on Saturday.
for day in DAYS[:5]: login(58, phone[58], day, f"{R.randint(15, 21):02d}:{R.randint(0, 59):02d}")
login(58, laptop[7], "2026-11-07", "01:47")
# The laptop at school before the weekend: two other students.
login(91, laptop[7], "2026-11-02", "10:15")
login(104, laptop[7], "2026-11-04", "11:20")

# Ghost votes: every ghost once for project 1 after 02:00, 15 ghosts again (10 twice, 5 three times).
ghosts = list(range(N_REAL + 1, N_REAL + N_GHOST + 1))
extra = {g: 1 for g in ghosts[:10]} | {g: 2 for g in ghosts[10:15]}
gv = []
for g in ghosts:
    for _ in range(1 + extra.get(g, 0)): gv.append(g)
times = sorted(f"02:{m:02d}" for m in sorted(R.sample(range(0, 59), 57)))
R.shuffle(gv)
# A ghost votes after it was created: sort ghosts by creation and give the earliest times to the earliest ones.
gv.sort(key=lambda g: users[g][4])
for g, t in zip(gv, times):
    vote(g, 1, laptop[7], "2026-11-07", t)

# Sort tables by time like a real log.
logins.sort(key=lambda r: (r[3], r[4], r[0])); logins = [(i + 1,) + r[1:] for i, r in enumerate(logins)]
votes.sort(key=lambda r: (r[4], r[5], r[0])); votes = [(i + 1,) + r[1:] for i, r in enumerate(votes)]

def q(v):
    if v is None: return "NULL"
    if isinstance(v, int): return str(v)
    return "'" + str(v).replace("'", "''") + "'"
def rows(name, rs, per=4):
    out = [f"INSERT INTO {name} VALUES"]
    out += ["  " + ", ".join("(" + ", ".join(q(x) for x in r) + ")" for r in rs[i:i + per]) + ("," if i + per < len(rs) else ";") for i in range(0, len(rs), per)]
    return "\n".join(out)
schema = """CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  class TEXT,
  created_day TEXT NOT NULL,
  created_time TEXT NOT NULL
);
CREATE TABLE projects (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL
);
CREATE TABLE team_members (
  project_id INTEGER NOT NULL REFERENCES projects(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  role TEXT NOT NULL
);
CREATE TABLE devices (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  kind TEXT NOT NULL,
  room TEXT
);
CREATE TABLE logins (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  device_id INTEGER NOT NULL REFERENCES devices(id),
  day TEXT NOT NULL,
  time TEXT NOT NULL
);
CREATE TABLE votes (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  project_id INTEGER NOT NULL REFERENCES projects(id),
  device_id INTEGER NOT NULL REFERENCES devices(id),
  day TEXT NOT NULL,
  time TEXT NOT NULL
);"""
sql = "\n\n".join([schema,
    rows("users", [(u,) + users[u] for u in sorted(users)], 3),
    rows("projects", projects, 2),
    rows("team_members", team_rows, 4),
    rows("devices", devices, 3),
    rows("logins", logins, 4),
    rows("votes", votes, 3)]) + "\n"
open(sys.argv[1], "w").write(sql)

# Facts of the story.
db = sqlite3.connect(":memory:"); db.executescript(sql)
one = lambda s: db.execute(s).fetchall()
print("votes", one("SELECT COUNT(*) FROM votes"), "rows total", sum(len(x) for x in (users, projects, team_rows, devices, logins, votes)))
print("per project", one("SELECT project_id, COUNT(*) FROM votes GROUP BY project_id ORDER BY 2 DESC"))
print("distinct voters", one("SELECT COUNT(DISTINCT user_id) FROM votes"))
print("min/max created", one("SELECT MIN(created_day), MAX(created_day) FROM users"))
print("by hour", one("SELECT substr(time,1,2), COUNT(*) FROM votes GROUP BY 1 ORDER BY 2 DESC LIMIT 4"))
print("night", one("SELECT day, project_id, COUNT(*) FROM votes WHERE time < '06:00' GROUP BY day, project_id"))
print("repeat", one("SELECT COUNT(*), MIN(user_id), group_concat(DISTINCT project_id) FROM (SELECT user_id, project_id FROM votes GROUP BY user_id, project_id HAVING COUNT(*) > 1)"))
print("nazar", one("SELECT COUNT(*) FROM votes v JOIN users u ON u.id = v.user_id WHERE u.last_name = 'Гнатюк'"))
print("ghosts", one("SELECT COUNT(*) FROM users u LEFT JOIN logins l ON l.user_id = u.id WHERE l.id IS NULL"))
print("ghost created", one("SELECT u.created_day, MIN(u.created_time), MAX(u.created_time), COUNT(*) FROM users u LEFT JOIN logins l ON l.user_id = u.id WHERE l.id IS NULL GROUP BY u.created_day"))
print("sofia", one("SELECT l.day, l.time FROM logins l JOIN users u ON u.id = l.user_id WHERE u.first_name = 'Софія' AND u.last_name = 'Мельник' ORDER BY l.day, l.time"))
print("devices top", one("SELECT d.name, COUNT(DISTINCT v.user_id) FROM votes v JOIN devices d ON d.id = v.device_id GROUP BY d.name ORDER BY COUNT(DISTINCT v.user_id) DESC LIMIT 4"))
print("laptop", one("SELECT u.first_name, u.last_name, l.day, l.time FROM logins l JOIN users u ON u.id = l.user_id JOIN devices d ON d.id = l.device_id WHERE d.name = 'Ноутбук-07'"))
print("team", one("SELECT title FROM projects WHERE id IN (SELECT project_id FROM team_members WHERE user_id IN (SELECT id FROM users WHERE last_name = 'Руденко'))"))
print("honest", one("SELECT p.title, COUNT(DISTINCT v.user_id) FROM votes v JOIN projects p ON p.id = v.project_id WHERE v.user_id IN (SELECT user_id FROM logins) GROUP BY p.title ORDER BY 2 DESC"))
print("dupe names", one("SELECT first_name, last_name, COUNT(*) FROM users GROUP BY 1,2 HAVING COUNT(*)>1"))
print("rudenko/melnyk/hnatiuk", one("SELECT last_name, COUNT(*) FROM users WHERE last_name IN ('Руденко','Мельник','Гнатюк','Бойко') GROUP BY 1"))
print("late votes", one("SELECT COUNT(*) FROM votes WHERE time >= '23:00'"))
print("ghost vote before create", one("SELECT COUNT(*) FROM votes v JOIN users u ON u.id = v.user_id WHERE v.day = u.created_day AND v.time < u.created_time"))
print("vote without login same device", one("SELECT COUNT(*) FROM votes v WHERE v.user_id <= 140 AND NOT EXISTS (SELECT 1 FROM logins l WHERE l.user_id = v.user_id AND l.device_id = v.device_id AND l.day = v.day)"))
