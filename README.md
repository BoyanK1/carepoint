CarePoint е full-stack платформа за записване и управление на медицински прегледи, разработена с Next.js, TypeScript, NextAuth и Supabase.

Тя поддържа три основни роли:

пациенти, които разглеждат лекари, записват часове, следят историята си и получават известия
лекари, които управляват графика си, преглеждат записаните часове и следят активността
администратори, които преглеждат кандидатурите на лекарите и извършват защитени действия чрез MFA
Основни функционалности:

откриване на лекари по име, специалност и град
записване на час с валидация на свободните слотове
управление на графика от страна на лекаря
история на прегледите, известия, любими, ревюта и обратна връзка
административен процес за одобряване на лекари
MFA за чувствителни административни действия
криптиране на чувствителни текстови полета, свързани с прегледите
PostgreSQL база данни и storage чрез Supabase
Технологичен стек:

Next.js 16 (App Router)
React 19
TypeScript
NextAuth
Supabase (Postgres, Auth, Storage)
Tailwind CSS
Resend
Vercel
Изисквания:
Преди да стартирате проекта, се уверете, че разполагате със:

Node.js 20+
npm
Supabase проект
Resend API ключ, ако искате имейлите да работят
Изтегляне на проекта:
Клонирайте хранилището и инсталирайте зависимостите:

git clone https://github.com/BoyanK1/carepoint.git
cd carepoint
npm install

Акаунти:
Администраторски акаунт - fenabg47@gmail.com
Парола - Bobo2009

Лекарски акаунт - demo.presentation.doctor@demo.carepoint.bg
Парола - CarePointDoctor123!

Акаунт на пациент - bobofiliqta21@gmail.com
Парола - Bobo20091@

Променливи на средата:
Копирайте примерния файл и попълнете собствените си стойности:

cp .env.example .env.local
Необходими променливи:

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=
APPOINTMENT_ENCRYPTION_KEY=

GITHUB_ID=
GITHUB_SECRET=

RESEND_API_KEY=
FEEDBACK_TO_EMAIL=
REMINDER_CRON_SECRET=
Бележки:

NEXTAUTH_URL трябва да бъде http://localhost:3000 за локална работа.
В production среда задайте NEXTAUTH_URL към реалния Vercel домейн.
Ако APPOINTMENT_ENCRYPTION_KEY не е зададен, приложението ще използва NEXTAUTH_SECRET за криптиране на чувствителните полета.
SUPABASE_SERVICE_ROLE_KEY е необходим за административни и server-side функционалности.
Стартиране на проекта:

npm run dev
Локално стартиране в production режим:

npm install
npm run build
npm start
Администрация и MFA:

Административен панел: /admin
MFA страница: /mfa
За да повишите потребител до администратор ръчно:

update user_profiles
set role = 'admin'
where id = '<auth_user_uuid>';
