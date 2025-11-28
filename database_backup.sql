--
-- PostgreSQL database dump
--

\restrict 8AeBJUprqgudWNEpyxZuHOr0qwNuxkXEBVPHjD0rt71O8zIafcMXJcaa9UeLJBE

-- Dumped from database version 15.15
-- Dumped by pg_dump version 15.15

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: categories; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.categories (
    id text NOT NULL,
    name text NOT NULL,
    icon text NOT NULL,
    type text NOT NULL,
    "isDefault" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "userId" text NOT NULL
);


ALTER TABLE public.categories OWNER TO "user";

--
-- Name: recurring_rules; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.recurring_rules (
    id text NOT NULL,
    amount double precision NOT NULL,
    "categoryId" text NOT NULL,
    merchant text,
    frequency text NOT NULL,
    "interval" integer DEFAULT 1 NOT NULL,
    "startDate" text NOT NULL,
    "lastRunDate" text,
    "nextRunDate" text NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "currencyCode" text DEFAULT 'CNY'::text NOT NULL,
    name text NOT NULL,
    "userId" text NOT NULL
);


ALTER TABLE public.recurring_rules OWNER TO "user";

--
-- Name: settings; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.settings (
    id text NOT NULL,
    "apiBaseUrl" text DEFAULT 'https://api.openai.com/v1'::text NOT NULL,
    "apiKey" text,
    model text DEFAULT 'gpt-4o'::text NOT NULL,
    currency text DEFAULT 'CNY'::text NOT NULL,
    "exchangeRateApiKey" text,
    language text DEFAULT 'en'::text NOT NULL,
    theme text DEFAULT 'system'::text NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "userId" text NOT NULL
);


ALTER TABLE public.settings OWNER TO "user";

--
-- Name: transactions; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.transactions (
    id text NOT NULL,
    amount double precision NOT NULL,
    "currencyCode" text DEFAULT 'CNY'::text NOT NULL,
    "categoryId" text NOT NULL,
    date text NOT NULL,
    note text,
    merchant text,
    type text NOT NULL,
    source text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "userId" text NOT NULL
);


ALTER TABLE public.transactions OWNER TO "user";

--
-- Name: users; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.users (
    id text NOT NULL,
    email text NOT NULL,
    password text DEFAULT '123456'::text NOT NULL,
    name text,
    role text DEFAULT 'USER'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.users OWNER TO "user";

--
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: user
--

COPY public.categories (id, name, icon, type, "isDefault", "createdAt", "updatedAt", "userId") FROM stdin;
3	Transport	🚗	EXPENSE	t	2025-11-27 01:12:53.86	2025-11-27 01:12:53.86	50e309cb-43ea-48ab-8e2a-85d1cfb6dce8
4	Digital & Tech	💻	EXPENSE	t	2025-11-27 01:12:53.86	2025-11-27 01:12:53.86	50e309cb-43ea-48ab-8e2a-85d1cfb6dce8
5	Housing	🏠	EXPENSE	t	2025-11-27 01:12:53.86	2025-11-27 01:12:53.86	50e309cb-43ea-48ab-8e2a-85d1cfb6dce8
6	Entertainment	🎬	EXPENSE	t	2025-11-27 01:12:53.86	2025-11-27 01:12:53.86	50e309cb-43ea-48ab-8e2a-85d1cfb6dce8
7	Medical	💊	EXPENSE	t	2025-11-27 01:12:53.86	2025-11-27 01:12:53.86	50e309cb-43ea-48ab-8e2a-85d1cfb6dce8
8	Game	🎮	EXPENSE	t	2025-11-27 01:12:53.86	2025-11-27 01:12:53.86	50e309cb-43ea-48ab-8e2a-85d1cfb6dce8
9	Salary	💰	INCOME	t	2025-11-27 01:12:53.86	2025-11-27 01:12:53.86	50e309cb-43ea-48ab-8e2a-85d1cfb6dce8
53ea8b16-d5f2-4e29-aeb4-3b8b4427a091	Education	🏫	EXPENSE	f	2025-11-27 03:50:45.893	2025-11-27 03:50:45.893	50e309cb-43ea-48ab-8e2a-85d1cfb6dce8
f378449b-d006-4340-a87f-b7cda9adedc6	Information	📰	EXPENSE	f	2025-11-27 04:28:25.857	2025-11-27 04:28:25.857	50e309cb-43ea-48ab-8e2a-85d1cfb6dce8
47356b48-81d4-4132-b4c4-89db08adbd72	Clothing	👕	EXPENSE	f	2025-11-27 07:09:22.603	2025-11-27 07:09:22.603	50e309cb-43ea-48ab-8e2a-85d1cfb6dce8
2	Ingredient	🥩	EXPENSE	t	2025-11-27 01:12:53.86	2025-11-28 06:12:56.566	50e309cb-43ea-48ab-8e2a-85d1cfb6dce8
937b76ad-6933-4737-86df-8d2ba85b0094	Meal	🍛	EXPENSE	f	2025-11-28 06:13:12.408	2025-11-28 06:13:12.408	50e309cb-43ea-48ab-8e2a-85d1cfb6dce8
\.


--
-- Data for Name: recurring_rules; Type: TABLE DATA; Schema: public; Owner: user
--

COPY public.recurring_rules (id, amount, "categoryId", merchant, frequency, "interval", "startDate", "lastRunDate", "nextRunDate", "isActive", "createdAt", "updatedAt", "currencyCode", name, "userId") FROM stdin;
a66d1844-5a93-45c7-a2bb-6e50a97bcb83	15.79	4	\N	YEARLY	1	2025-11-23	\N	2026-11-23	t	2025-11-27 04:19:13.364	2025-11-27 04:19:13.47	USD	DOMAIN	50e309cb-43ea-48ab-8e2a-85d1cfb6dce8
641363d5-3026-4500-a278-47c9a0db1157	198	f378449b-d006-4340-a87f-b7cda9adedc6	\N	YEARLY	1	2025-11-25	\N	2026-11-25	t	2025-11-27 04:29:15.241	2025-11-27 04:29:15.317	CNY	知识星球 星河AI研究院	50e309cb-43ea-48ab-8e2a-85d1cfb6dce8
bb677e9b-2f34-4516-a489-7aa990d022fd	282.8	f378449b-d006-4340-a87f-b7cda9adedc6	\N	YEARLY	1	2025-11-26	\N	2026-11-26	t	2025-11-27 04:31:13.415	2025-11-27 04:31:13.541	CNY	知识星球 南半球聊财经	50e309cb-43ea-48ab-8e2a-85d1cfb6dce8
4522624c-a3ef-4866-a0b6-30654fdeba78	182.5	f378449b-d006-4340-a87f-b7cda9adedc6	\N	YEARLY	1	2025-05-19	\N	2026-05-19	t	2025-11-27 04:33:28.403	2025-11-27 04:33:28.483	CNY	知识星球 汤质的茶馆	50e309cb-43ea-48ab-8e2a-85d1cfb6dce8
775d62c7-ca04-46fe-8c59-5c408734a1bf	10.29	4	\N	YEARLY	1	2025-05-17	\N	2026-05-17	t	2025-11-27 04:37:07.126	2025-11-27 04:37:07.214	USD	VPS RackNerd	50e309cb-43ea-48ab-8e2a-85d1cfb6dce8
581e1a47-2fd2-4faf-8b74-799b7bd0cad4	13.34	4	\N	YEARLY	1	2025-04-01	\N	2026-04-01	t	2025-11-27 04:56:06.161	2025-11-27 04:56:06.248	USD	VPS QDE	50e309cb-43ea-48ab-8e2a-85d1cfb6dce8
a56ea71a-b0fc-4287-b6d7-f0afee8c4a3b	12.9	4	\N	YEARLY	1	2025-06-14	\N	2026-06-14	t	2025-11-27 05:01:00.234	2025-11-27 05:01:00.276	USD	VPS ZgoCloud	50e309cb-43ea-48ab-8e2a-85d1cfb6dce8
8876684e-c049-4019-aa09-98e824b43c23	73.45	5	\N	MONTHLY	1	2025-10-17	\N	2025-12-17	t	2025-11-27 05:09:51.264	2025-11-27 05:09:51.338	CAD	Wi-Fi Virgin Plus	50e309cb-43ea-48ab-8e2a-85d1cfb6dce8
4e411a34-8eb7-46e3-aca7-3ea0c0cdd655	1105	5	\N	MONTHLY	1	2025-08-25	\N	2025-12-25	t	2025-11-27 06:42:06.838	2025-11-27 06:42:06.934	CAD	房租	50e309cb-43ea-48ab-8e2a-85d1cfb6dce8
\.


--
-- Data for Name: settings; Type: TABLE DATA; Schema: public; Owner: user
--

COPY public.settings (id, "apiBaseUrl", "apiKey", model, currency, "exchangeRateApiKey", language, theme, "updatedAt", "userId") FROM stdin;
ee0c32c1-3c70-40ac-974b-353c695b66bb	https://aiapi.techleaf.xyz/v1	sk-b67jX3i1SC0a8daqwUcKR2HvFcIdkzscsbB8WSOVws7z8EL4	gemini-2.5-flash	CAD	f97bc1648959b6f3dbe8749b	zh	system	2025-11-27 01:12:54.008	50e309cb-43ea-48ab-8e2a-85d1cfb6dce8
\.


--
-- Data for Name: transactions; Type: TABLE DATA; Schema: public; Owner: user
--

COPY public.transactions (id, amount, "currencyCode", "categoryId", date, note, merchant, type, source, "createdAt", "updatedAt", "userId") FROM stdin;
0bd12e01-74aa-479c-8881-d04393c45de1	3.3	CAD	3	2025-11-27	Bus fare	Bus	EXPENSE	AI_SCAN	2025-11-28 06:14:55.958	2025-11-28 06:14:55.958	50e309cb-43ea-48ab-8e2a-85d1cfb6dce8
5766d64c-ad37-4dd2-b0eb-5bd025e8eb74	14.9	CAD	2	2025-11-27	哈根达斯冰淇淋, 冷冻水果	Walmart	EXPENSE	AI_SCAN	2025-11-28 06:14:55.98	2025-11-28 06:14:55.98	50e309cb-43ea-48ab-8e2a-85d1cfb6dce8
a0fa258c-c5c5-4b18-af97-58e60f3e892a	37.44	CNY	8	2025-11-24	Kemono Teatime	Steam	EXPENSE	MANUAL	2025-11-27 03:51:48.391	2025-11-27 03:51:48.391	50e309cb-43ea-48ab-8e2a-85d1cfb6dce8
5d6addff-f3f3-4e13-86fe-e3ece1f283c7	15.79	USD	4	2025-11-23	Auto-generated recurring bill	DOMAIN	EXPENSE	RECURRING	2025-11-27 04:19:13.423	2025-11-27 04:19:13.423	50e309cb-43ea-48ab-8e2a-85d1cfb6dce8
47203933-95f0-4c18-a3d9-bcbbf0975d31	198	CNY	f378449b-d006-4340-a87f-b7cda9adedc6	2025-11-25	Auto-generated recurring bill	知识星球 星河AI研究院	EXPENSE	RECURRING	2025-11-27 04:29:15.3	2025-11-27 04:29:15.3	50e309cb-43ea-48ab-8e2a-85d1cfb6dce8
71208896-1f70-4c9a-892c-e36c5641bc52	282.8	CNY	f378449b-d006-4340-a87f-b7cda9adedc6	2025-11-26	Auto-generated recurring bill	知识星球 南半球聊财经	EXPENSE	RECURRING	2025-11-27 04:31:13.516	2025-11-27 04:31:13.516	50e309cb-43ea-48ab-8e2a-85d1cfb6dce8
6b2fd513-efc7-4b88-bc34-12d52ae610f2	182.5	CNY	f378449b-d006-4340-a87f-b7cda9adedc6	2025-05-19	Auto-generated recurring bill	知识星球 汤质的茶馆	EXPENSE	RECURRING	2025-11-27 04:33:28.457	2025-11-27 04:33:28.457	50e309cb-43ea-48ab-8e2a-85d1cfb6dce8
d0a3d5a7-d916-4e09-98d5-3e7f2067fcac	10.29	USD	4	2025-05-17	Auto-generated recurring bill	VPS RackNerd	EXPENSE	RECURRING	2025-11-27 04:37:07.177	2025-11-27 04:37:07.177	50e309cb-43ea-48ab-8e2a-85d1cfb6dce8
657ef34d-ec10-4eda-bd93-7a54286c58b5	3.3	CAD	3	2025-11-27	Bus fare	Bus Service	EXPENSE	AI_SCAN	2025-11-28 06:14:55.96	2025-11-28 06:14:55.96	50e309cb-43ea-48ab-8e2a-85d1cfb6dce8
b4314f99-d9bf-46e7-8b16-452f21cefcf7	12.31	CAD	5	2025-11-27	POKAL NN glass 35 cl (2), OFTAST side plate 19 (6), OFTAST plate 25 whit (3)	IKEA	EXPENSE	AI_SCAN	2025-11-28 06:14:55.981	2025-11-28 06:14:55.981	50e309cb-43ea-48ab-8e2a-85d1cfb6dce8
fd9ed85c-a225-4ec0-8f27-106893025dd0	16.37	CAD	5	2025-11-22	Purchase at Value Village	Value Village	EXPENSE	AI_SCAN	2025-11-27 06:59:23.655	2025-11-27 06:59:23.655	50e309cb-43ea-48ab-8e2a-85d1cfb6dce8
1ad58eb1-24f0-40c0-9658-0af66735c808	15.53	CAD	5	2025-11-17	Purchase at Value Village	Value Village	EXPENSE	AI_SCAN	2025-11-27 06:59:23.686	2025-11-27 06:59:23.686	50e309cb-43ea-48ab-8e2a-85d1cfb6dce8
f905935a-8023-4dae-b37f-ce4bdd3d9491	28.46	CAD	937b76ad-6933-4737-86df-8d2ba85b0094	2025-11-17	Bulk food items	Bulk Barn	EXPENSE	AI_SCAN	2025-11-28 06:15:44.325	2025-11-28 06:15:44.325	50e309cb-43ea-48ab-8e2a-85d1cfb6dce8
2f363176-427e-44c4-97fb-9ad887d53387	7.96	CAD	2	2025-11-17	Purchase at Food Basics	Food Basics	EXPENSE	AI_SCAN	2025-11-27 06:59:23.725	2025-11-27 06:59:23.725	50e309cb-43ea-48ab-8e2a-85d1cfb6dce8
8f1bf1af-c0a1-40ed-aae5-e6bcfbdf1abd	67.72	CAD	2	2025-09-01	Groceries from Foody World	Foody World	EXPENSE	AI_SCAN	2025-11-27 07:38:03.36	2025-11-27 07:38:03.36	50e309cb-43ea-48ab-8e2a-85d1cfb6dce8
5b877a90-b6e0-40d0-b7a7-ab7a5b045063	9.04	CAD	5	2025-08-29	Purchase at Dollarama	Dollarama	EXPENSE	AI_SCAN	2025-11-27 07:38:03.385	2025-11-27 07:38:03.385	50e309cb-43ea-48ab-8e2a-85d1cfb6dce8
94ca158e-ab10-4d87-bfb2-efd5eb1d18f8	1.05	CAD	937b76ad-6933-4737-86df-8d2ba85b0094	2025-11-27	Hot dog	IKEA	EXPENSE	AI_SCAN	2025-11-28 06:17:09.789	2025-11-28 06:17:09.789	50e309cb-43ea-48ab-8e2a-85d1cfb6dce8
a1e4a340-2295-490b-9c80-6c179132cc7b	13.34	USD	4	2025-04-01	Auto-generated recurring bill	VPS QDE	EXPENSE	RECURRING	2025-11-27 04:56:06.207	2025-11-27 04:56:06.207	50e309cb-43ea-48ab-8e2a-85d1cfb6dce8
ef15670f-ad81-4ba4-996e-40ed5bce73f0	12.9	USD	4	2025-06-14	Auto-generated recurring bill	VPS ZgoCloud	EXPENSE	RECURRING	2025-11-27 05:01:00.268	2025-11-27 05:01:00.268	50e309cb-43ea-48ab-8e2a-85d1cfb6dce8
387ca8e9-3337-4b7f-a577-1ddf0c8ecca0	27333.13	CAD	53ea8b16-d5f2-4e29-aeb4-3b8b4427a091	2025-11-14	学费	University Of Toronto	EXPENSE	AI_SCAN	2025-11-27 05:06:33.692	2025-11-27 05:06:33.692	50e309cb-43ea-48ab-8e2a-85d1cfb6dce8
2a334bc7-fe9c-4fa3-9b48-c3c5011c0c53	73.45	CAD	5	2025-10-17	Auto-generated recurring bill	Wi-Fi Virgin Plus	EXPENSE	RECURRING	2025-11-27 05:09:51.296	2025-11-27 05:09:51.296	50e309cb-43ea-48ab-8e2a-85d1cfb6dce8
f9a41887-f8f8-46f2-ac0c-77d07b107cf4	73.45	CAD	5	2025-11-17	Auto-generated recurring bill	Wi-Fi Virgin Plus	EXPENSE	RECURRING	2025-11-27 05:09:51.326	2025-11-27 05:09:51.326	50e309cb-43ea-48ab-8e2a-85d1cfb6dce8
267685dd-0eb4-4977-b859-44da0f665e2f	73.59	CAD	2	2025-11-24	Items Subtotal, Checkout Bag Fee, Tip, Service Fee	Instacart	EXPENSE	AI_SCAN	2025-11-27 05:22:24.308	2025-11-27 05:22:24.308	50e309cb-43ea-48ab-8e2a-85d1cfb6dce8
7011112c-9f6f-4cdc-9fe2-53cd44637292	45.28	CAD	2	2025-11-15	Order from Food Basics	Instacart	EXPENSE	AI_SCAN	2025-11-27 05:24:35.851	2025-11-27 05:24:35.851	50e309cb-43ea-48ab-8e2a-85d1cfb6dce8
b0c3d3b2-64f7-4cf8-bf4f-cd20661be23e	62.72	CAD	2	2025-11-12	Grocery order including fees and tip	Instacart	EXPENSE	AI_SCAN	2025-11-27 05:35:25.459	2025-11-27 05:35:25.459	50e309cb-43ea-48ab-8e2a-85d1cfb6dce8
35722da1-6ab6-49eb-8a39-1d2e8221afc4	427.58	CAD	5	2025-11-26	AIRMSEN Countertop Dishwasher	Amazon	EXPENSE	AI_SCAN	2025-11-27 05:51:44.226	2025-11-27 05:51:44.226	50e309cb-43ea-48ab-8e2a-85d1cfb6dce8
1fc0c5d9-3872-4338-b579-c45323253800	20	CAD	2	2025-11-26	Somat Dishwasher Spezial Salz	Amazon	EXPENSE	AI_SCAN	2025-11-27 05:53:58.176	2025-11-27 05:53:58.176	50e309cb-43ea-48ab-8e2a-85d1cfb6dce8
5718e3e6-7b68-416d-ab7a-4b6ae175a800	48.16	CAD	2	2025-11-06	FoodBasic	Instacart	EXPENSE	AI_SCAN	2025-11-27 06:01:02.824	2025-11-27 06:01:02.824	50e309cb-43ea-48ab-8e2a-85d1cfb6dce8
dd568c5c-7afd-4060-ba7d-331ead40500b	66.94	CAD	2	2025-10-22	FoodBasic	Instacart	EXPENSE	AI_SCAN	2025-11-27 06:03:24.596	2025-11-27 06:03:24.596	50e309cb-43ea-48ab-8e2a-85d1cfb6dce8
5e1a5d8a-9762-4a40-aacb-a54f49586849	24.01	CAD	2	2025-10-30	Food Basics	Instacart	EXPENSE	AI_SCAN	2025-11-27 06:05:22.136	2025-11-27 06:05:22.136	50e309cb-43ea-48ab-8e2a-85d1cfb6dce8
72ff9b00-ff82-443d-bcb4-3301323f78dd	66.94	CAD	2	2025-10-22	Food Basics	Instacart	EXPENSE	AI_SCAN	2025-11-27 06:06:25.959	2025-11-27 06:06:25.959	50e309cb-43ea-48ab-8e2a-85d1cfb6dce8
6967337b-0e07-4fc0-9167-c7ef5b823bf3	49.58	CAD	2	2025-10-19	Food Basics, Grocery order including items, fees, and tip.	Instacart	EXPENSE	AI_SCAN	2025-11-27 06:11:07.507	2025-11-27 06:11:07.507	50e309cb-43ea-48ab-8e2a-85d1cfb6dce8
6a9edb64-3aae-4ffd-aecd-4408083b2ab5	22.99	CAD	2	2025-10-12	Food Basics, Groceries delivery including items, fees, and tip.	Instacart	EXPENSE	AI_SCAN	2025-11-27 06:12:03.849	2025-11-27 06:12:03.849	50e309cb-43ea-48ab-8e2a-85d1cfb6dce8
e30788d8-c5f6-4a53-83a4-57002a6d8d17	63.68	CAD	2	2025-10-09	Food Basics, Grocery order	Instacart	EXPENSE	AI_SCAN	2025-11-27 06:13:59.886	2025-11-27 06:13:59.886	50e309cb-43ea-48ab-8e2a-85d1cfb6dce8
0995e440-5be2-434c-99d2-679ddcd6f254	58.86	CAD	2	2025-09-23	Food Basics, Grocery order	Instacart	EXPENSE	AI_SCAN	2025-11-27 06:13:59.875	2025-11-27 06:13:59.875	50e309cb-43ea-48ab-8e2a-85d1cfb6dce8
8d71ceca-db26-4baf-87fe-85433cae165b	35.14	CAD	2	2025-08-29		嘟嘟快送	EXPENSE	AI_SCAN	2025-11-27 06:19:00.908	2025-11-27 06:19:00.908	50e309cb-43ea-48ab-8e2a-85d1cfb6dce8
9f405ab7-e26b-419d-af0c-750a26ad75c6	92.95	USD	2	2025-09-28	Cooking oil, sauces, and kitchen supplies	嘟嘟快送	EXPENSE	AI_SCAN	2025-11-27 06:20:42.169	2025-11-27 06:20:42.169	50e309cb-43ea-48ab-8e2a-85d1cfb6dce8
f036ee18-de2e-43c6-8558-0b5453773e15	48.07	USD	2	2025-10-02	Instant noodles and other food items	嘟嘟快送	EXPENSE	AI_SCAN	2025-11-27 06:20:42.184	2025-11-27 06:20:42.184	50e309cb-43ea-48ab-8e2a-85d1cfb6dce8
511e8ca4-e239-422d-a5e9-0958dfaaa6c7	30.06	USD	2	2025-09-12	Packaged food and Coca-Cola	嘟嘟快送	EXPENSE	AI_SCAN	2025-11-27 06:20:42.227	2025-11-27 06:20:42.227	50e309cb-43ea-48ab-8e2a-85d1cfb6dce8
3878a6bc-8620-4ca4-8f09-474e804dfa9e	38.08	USD	2	2025-10-07	Instant noodles and packaged food	嘟嘟快送	EXPENSE	AI_SCAN	2025-11-27 06:20:42.229	2025-11-27 06:20:42.229	50e309cb-43ea-48ab-8e2a-85d1cfb6dce8
360fc6c5-8629-412e-8f0a-060cd006fe87	29.67	USD	2	2025-10-05	Packaged food items	嘟嘟快送	EXPENSE	AI_SCAN	2025-11-27 06:20:42.235	2025-11-27 06:20:42.235	50e309cb-43ea-48ab-8e2a-85d1cfb6dce8
0a4aef11-091f-46c0-aee3-2d4a866d46b0	1105	CAD	5	2025-08-25	Auto-generated recurring bill	房租	EXPENSE	RECURRING	2025-11-27 06:42:06.866	2025-11-27 06:42:06.866	50e309cb-43ea-48ab-8e2a-85d1cfb6dce8
6ad156bd-86b9-4fc3-984c-595407291d00	1105	CAD	5	2025-09-25	Auto-generated recurring bill	房租	EXPENSE	RECURRING	2025-11-27 06:42:06.893	2025-11-27 06:42:06.893	50e309cb-43ea-48ab-8e2a-85d1cfb6dce8
8700cdc6-a289-4d70-9ace-4dc80089a7dd	1105	CAD	5	2025-10-25	Auto-generated recurring bill	房租	EXPENSE	RECURRING	2025-11-27 06:42:06.91	2025-11-27 06:42:06.91	50e309cb-43ea-48ab-8e2a-85d1cfb6dce8
9b72d0a6-07b5-4f47-81de-378512c60fff	1105	CAD	5	2025-11-25	Auto-generated recurring bill	房租	EXPENSE	RECURRING	2025-11-27 06:42:06.927	2025-11-27 06:42:06.927	50e309cb-43ea-48ab-8e2a-85d1cfb6dce8
98a21f87-7bd5-4fa8-99e1-7f43fbeaca81	27393.63	CAD	53ea8b16-d5f2-4e29-aeb4-3b8b4427a091	2025-08-02	Bill Payment Pc-University Of Toronto 79163776	University Of Toronto	EXPENSE	AI_SCAN	2025-11-27 06:50:15.461	2025-11-27 06:50:15.461	50e309cb-43ea-48ab-8e2a-85d1cfb6dce8
3ca0ee53-b40a-4146-9af2-96dfbed3f697	11.98	CAD	2	2025-11-24	Purchase at Skyland Food Mart	Skyland Food Mart	EXPENSE	AI_SCAN	2025-11-27 06:59:23.594	2025-11-27 06:59:23.594	50e309cb-43ea-48ab-8e2a-85d1cfb6dce8
64727380-3609-4db6-9589-aa694783f7dc	11.29	CAD	5	2025-11-24	感应灯	Value Village	EXPENSE	AI_SCAN	2025-11-27 06:59:23.574	2025-11-27 06:59:23.574	50e309cb-43ea-48ab-8e2a-85d1cfb6dce8
5b99ca44-13b7-4b81-81d6-d5daf31923f2	34.67	CAD	5	2025-08-29	Purchase at Ikea	Ikea	EXPENSE	AI_SCAN	2025-11-27 07:39:03.709	2025-11-27 07:39:03.709	50e309cb-43ea-48ab-8e2a-85d1cfb6dce8
721d1c83-42ba-4d24-9914-1f7b9834c21e	7.63	CAD	2	2025-11-22	Purchase at Skyland Food Mart	Skyland Food Mart	EXPENSE	AI_SCAN	2025-11-27 06:59:23.646	2025-11-27 06:59:23.646	50e309cb-43ea-48ab-8e2a-85d1cfb6dce8
b9dce5d1-8dff-4858-b120-e7d58fe33052	10.15	CAD	5	2025-11-08	Toronto On (Apple Pay)	Value Village	EXPENSE	AI_SCAN	2025-11-27 07:10:58.416	2025-11-27 07:10:58.416	50e309cb-43ea-48ab-8e2a-85d1cfb6dce8
92bec6f4-7e05-431e-905f-ec9c9b60d391	15.79	CAD	5	2025-11-13	Toronto On (Apple Pay)	Value Village	EXPENSE	AI_SCAN	2025-11-27 07:10:58.407	2025-11-27 07:10:58.407	50e309cb-43ea-48ab-8e2a-85d1cfb6dce8
a3973216-98a2-45cc-9847-26676c806c74	11.3	CAD	47356b48-81d4-4132-b4c4-89db08adbd72	2025-11-08	Scarborough On (Apple Pay)	Giant Tiger	EXPENSE	AI_SCAN	2025-11-27 07:10:58.456	2025-11-27 07:10:58.456	50e309cb-43ea-48ab-8e2a-85d1cfb6dce8
b769d0b0-df4b-4af8-b2cd-6fe99c203c61	19.74	CAD	2	2025-11-08	Toronto On (Apple Pay)	Bulk Barn	EXPENSE	AI_SCAN	2025-11-27 07:10:58.469	2025-11-27 07:10:58.469	50e309cb-43ea-48ab-8e2a-85d1cfb6dce8
31de4b79-98dc-4ae8-892d-ec8e9e1a3f28	25.97	CAD	2	2025-11-08	Scarborough On (Apple Pay)	Food Basics	EXPENSE	AI_SCAN	2025-11-27 07:10:58.496	2025-11-27 07:10:58.496	50e309cb-43ea-48ab-8e2a-85d1cfb6dce8
813e682e-8c45-4932-a310-c8e9e2253a7e	10.17	CAD	5	2025-11-08	Toronto On (Apple Pay)	Dollarama	EXPENSE	AI_SCAN	2025-11-27 07:10:58.51	2025-11-27 07:10:58.51	50e309cb-43ea-48ab-8e2a-85d1cfb6dce8
44ca5cdb-4d06-4e98-a9c3-5b05e081d1ca	46.49	CAD	2	2025-11-01	Foody World purchase	Foody World	EXPENSE	AI_SCAN	2025-11-27 07:12:55.371	2025-11-27 07:12:55.371	50e309cb-43ea-48ab-8e2a-85d1cfb6dce8
d10b5734-82ba-4e6c-8ac0-bdafe99c7c07	22.7	CAD	2	2025-11-01	Bulk Barn purchase	Bulk Barn	EXPENSE	AI_SCAN	2025-11-27 07:12:55.355	2025-11-27 07:12:55.355	50e309cb-43ea-48ab-8e2a-85d1cfb6dce8
28125151-42c6-40c5-a448-36e31efb34eb	3.68	CAD	5	2025-11-01	Ikea purchase	Ikea	EXPENSE	AI_SCAN	2025-11-27 07:12:55.469	2025-11-27 07:12:55.469	50e309cb-43ea-48ab-8e2a-85d1cfb6dce8
5b64b116-1fb3-4c62-8be2-c47fba579a92	16.73	CAD	5	2025-11-01	Ikea purchase	Ikea	EXPENSE	AI_SCAN	2025-11-27 07:12:55.488	2025-11-27 07:12:55.488	50e309cb-43ea-48ab-8e2a-85d1cfb6dce8
08aa1cfa-ce80-49aa-9561-5b2554ff200a	38.15	CAD	2	2025-10-28	Skyland Food Mart purchase	Skyland Food Mart	EXPENSE	AI_SCAN	2025-11-27 07:12:55.569	2025-11-27 07:12:55.569	50e309cb-43ea-48ab-8e2a-85d1cfb6dce8
0a995a2b-17a6-49a5-ac23-4bff78c3bb2d	7.9	CAD	4	2025-10-28	Value Village purchase	Value Village	EXPENSE	AI_SCAN	2025-11-27 07:12:55.579	2025-11-27 07:12:55.579	50e309cb-43ea-48ab-8e2a-85d1cfb6dce8
2c5e6d3d-cb75-4e7a-8923-0fa0cc6c9fb8	9.25	CAD	5	2025-10-28	Dollarama purchase	Dollarama	EXPENSE	AI_SCAN	2025-11-27 07:12:55.61	2025-11-27 07:12:55.61	50e309cb-43ea-48ab-8e2a-85d1cfb6dce8
56510282-2a64-4986-9880-4b9b0dcdb70c	68	CAD	2	2025-10-25	Foody World purchase	Foody World	EXPENSE	AI_SCAN	2025-11-27 07:12:55.631	2025-11-27 07:12:55.631	50e309cb-43ea-48ab-8e2a-85d1cfb6dce8
8b69e0e2-b107-44a6-9564-8096e072c471	94.32	CAD	2	2025-10-25	Foody World purchase	Foody World	EXPENSE	AI_SCAN	2025-11-27 07:12:55.666	2025-11-27 07:12:55.666	50e309cb-43ea-48ab-8e2a-85d1cfb6dce8
7a3b7c3f-d445-4de2-83cc-25fffd3fd96c	8.48	CAD	5	2025-10-25	Dollarama purchase	Dollarama	EXPENSE	AI_SCAN	2025-11-27 07:12:55.679	2025-11-27 07:12:55.679	50e309cb-43ea-48ab-8e2a-85d1cfb6dce8
5d18944b-cded-4e8c-8b81-bd33eb9c3fdc	28.23	CAD	47356b48-81d4-4132-b4c4-89db08adbd72	2025-10-14	Toronto On (Apple Pay)	Value Village	EXPENSE	AI_SCAN	2025-11-27 07:15:56.966	2025-11-27 07:15:56.966	50e309cb-43ea-48ab-8e2a-85d1cfb6dce8
9f91cde0-1f46-411a-84b4-181645725c8d	9.18	CAD	2	2025-10-14	Scarborough On (Apple Pay)	Skyland Food Mart	EXPENSE	AI_SCAN	2025-11-27 07:15:56.949	2025-11-27 07:15:56.949	50e309cb-43ea-48ab-8e2a-85d1cfb6dce8
0fac031b-9da8-4a3e-a17b-a547d02f877e	21.47	CAD	5	2025-10-10	Scarborough On (Apple Pay)	Dollarama	EXPENSE	AI_SCAN	2025-11-27 07:15:57.038	2025-11-27 07:15:57.038	50e309cb-43ea-48ab-8e2a-85d1cfb6dce8
1dd46425-ab8a-4879-8e34-69fe58d7114d	11.73	CAD	2	2025-10-01	Scarborough On (Apple Pay)	Skyland Food Mart	EXPENSE	AI_SCAN	2025-11-27 07:15:57.053	2025-11-27 07:15:57.053	50e309cb-43ea-48ab-8e2a-85d1cfb6dce8
6d715c8c-e5e9-4a2d-b5eb-8be2a20a93df	12.42	CAD	4	2025-09-30	Markham On (Apple Pay)	Value Village	EXPENSE	AI_SCAN	2025-11-27 07:15:57.095	2025-11-27 07:15:57.095	50e309cb-43ea-48ab-8e2a-85d1cfb6dce8
fc3692ed-31b1-450e-b063-da4845088cbe	12	CAD	2	2025-09-26	Scarborough On (Apple Pay)	Walmart	EXPENSE	AI_SCAN	2025-11-27 07:15:57.107	2025-11-27 07:15:57.107	50e309cb-43ea-48ab-8e2a-85d1cfb6dce8
0b561ee5-c3ab-49c9-bad6-7235a97e95d9	8.31	CAD	2	2025-09-26	Scarborough On (Apple Pay)	Skyland Food Mart	EXPENSE	AI_SCAN	2025-11-27 07:15:57.116	2025-11-27 07:15:57.116	50e309cb-43ea-48ab-8e2a-85d1cfb6dce8
9b7094f7-2b73-46a8-bc89-1bbdc0a6c7fd	4.47	CAD	2	2025-09-26	Scarborough On (Apple Pay)	Food Basics	EXPENSE	AI_SCAN	2025-11-27 07:15:57.13	2025-11-27 07:15:57.13	50e309cb-43ea-48ab-8e2a-85d1cfb6dce8
92072a8c-dcb6-4d11-a3b4-381a60239899	5.65	CAD	5	2025-09-26	General merchandise	Dollarama	EXPENSE	AI_SCAN	2025-11-27 07:34:14.432	2025-11-27 07:34:14.432	50e309cb-43ea-48ab-8e2a-85d1cfb6dce8
d006d1bf-586d-4846-b70a-8f177b6d2602	15.97	CAD	2	2025-09-26	Groceries	Fusion Supermarket	EXPENSE	AI_SCAN	2025-11-27 07:34:14.394	2025-11-27 07:34:14.394	50e309cb-43ea-48ab-8e2a-85d1cfb6dce8
efd9c653-1acb-4b38-abd6-2882ad256885	1.7	CAD	5	2025-09-26	General merchandise	Dollarama	EXPENSE	AI_SCAN	2025-11-27 07:34:14.526	2025-11-27 07:34:14.526	50e309cb-43ea-48ab-8e2a-85d1cfb6dce8
aeb8c9ca-ed91-4c58-b9dd-aa9d01968384	7.9	CAD	4	2025-09-26	Second-hand goods	Value Village	EXPENSE	AI_SCAN	2025-11-27 07:34:14.538	2025-11-27 07:34:14.538	50e309cb-43ea-48ab-8e2a-85d1cfb6dce8
e13fb0fd-7cfe-4e7b-beb3-56146bb7b97b	3.39	CAD	5	2025-09-21	General merchandise	Dollarama	EXPENSE	AI_SCAN	2025-11-27 07:34:14.577	2025-11-27 07:34:14.577	50e309cb-43ea-48ab-8e2a-85d1cfb6dce8
81a72f2b-f4e1-425a-81d5-bc94fed2179a	37.29	CAD	2	2025-09-19	Groceries	Food Basics	EXPENSE	AI_SCAN	2025-11-27 07:34:14.669	2025-11-27 07:34:14.669	50e309cb-43ea-48ab-8e2a-85d1cfb6dce8
dafc84e0-40ef-4d75-afe5-2b4de4bd5d86	45.19	CAD	47356b48-81d4-4132-b4c4-89db08adbd72	2025-09-19	Second-hand goods	Value Village	EXPENSE	AI_SCAN	2025-11-27 07:34:14.687	2025-11-27 07:34:14.687	50e309cb-43ea-48ab-8e2a-85d1cfb6dce8
7900a6bc-adac-48f8-8310-7ac3e3a0e01b	18.06	CAD	2	2025-09-17	Groceries	Food Basics	EXPENSE	AI_SCAN	2025-11-27 07:34:14.699	2025-11-27 07:34:14.699	50e309cb-43ea-48ab-8e2a-85d1cfb6dce8
84e237b1-702a-4aa1-ab32-274ded2f45a5	13.63	CAD	4	2025-09-17	General merchandise	Dollarama	EXPENSE	AI_SCAN	2025-11-27 07:34:14.718	2025-11-27 07:34:14.718	50e309cb-43ea-48ab-8e2a-85d1cfb6dce8
f8891b90-b3fc-445a-8c69-ee8b8fc011b4	8.23	CAD	4	2025-09-14	Thrift store purchase	Value Village	EXPENSE	AI_SCAN	2025-11-27 07:36:05.629	2025-11-27 07:36:05.629	50e309cb-43ea-48ab-8e2a-85d1cfb6dce8
c78a3dff-a155-4989-abb1-bbc95b20fcc1	0.75	CAD	2	2025-09-14	Groceries	Fusion Supermarket	EXPENSE	AI_SCAN	2025-11-27 07:36:05.642	2025-11-27 07:36:05.642	50e309cb-43ea-48ab-8e2a-85d1cfb6dce8
a9c82151-9e87-4c47-a207-1205697a8a80	5.94	CAD	5	2025-09-14	General purchase	Walmart	EXPENSE	AI_SCAN	2025-11-27 07:36:05.728	2025-11-27 07:36:05.728	50e309cb-43ea-48ab-8e2a-85d1cfb6dce8
913bfa7f-44de-49d9-b92d-6a2a9a128bbb	29.33	CAD	47356b48-81d4-4132-b4c4-89db08adbd72	2025-09-13	Thrift store purchase	Value Village	EXPENSE	AI_SCAN	2025-11-27 07:36:05.741	2025-11-27 07:36:05.741	50e309cb-43ea-48ab-8e2a-85d1cfb6dce8
44ab9501-b522-4d0c-abd2-6df41f4decda	26.89	CAD	2	2025-09-12	Groceries	Food Basics	EXPENSE	AI_SCAN	2025-11-27 07:36:05.781	2025-11-27 07:36:05.781	50e309cb-43ea-48ab-8e2a-85d1cfb6dce8
5ba83f1e-d641-414a-aedc-1e873aa16abd	5.65	CAD	5	2025-09-12	General purchase	Dollarama	EXPENSE	AI_SCAN	2025-11-27 07:36:05.802	2025-11-27 07:36:05.802	50e309cb-43ea-48ab-8e2a-85d1cfb6dce8
a6587754-ad96-4a72-997d-01c0295265b3	8.58	CAD	2	2025-09-08	Groceries	Skyland Food Mart	EXPENSE	AI_SCAN	2025-11-27 07:36:05.816	2025-11-27 07:36:05.816	50e309cb-43ea-48ab-8e2a-85d1cfb6dce8
65cc6940-277e-4c44-a0f3-44fca7c4acf6	37.27	CAD	5	2025-09-08	Thrift store purchase	Value Village	EXPENSE	AI_SCAN	2025-11-27 07:36:05.827	2025-11-27 07:36:05.827	50e309cb-43ea-48ab-8e2a-85d1cfb6dce8
12ddef28-49c4-4a0b-8f3f-724f72acfdf6	17.14	CAD	2	2025-09-04	Groceries	Food Basics	EXPENSE	AI_SCAN	2025-11-27 07:36:05.838	2025-11-27 07:36:05.838	50e309cb-43ea-48ab-8e2a-85d1cfb6dce8
f33d9a6d-ded7-4c0f-a876-9a16b066522b	11.02	CAD	5	2025-09-04	General purchase	Dollarama	EXPENSE	AI_SCAN	2025-11-27 07:36:05.854	2025-11-27 07:36:05.854	50e309cb-43ea-48ab-8e2a-85d1cfb6dce8
7e784b34-13d7-4c17-87cf-25ade4e21b11	7.07	CAD	2	2025-09-03	Groceries from Fusion Supermarket	Fusion Supermarket	EXPENSE	AI_SCAN	2025-11-27 07:38:03.303	2025-11-27 07:38:03.303	50e309cb-43ea-48ab-8e2a-85d1cfb6dce8
a3dfffbc-f46f-46fc-8291-23a7bb310ba0	1.98	CAD	2	2025-09-04	Purchase at Dollarama	Dollarama	EXPENSE	AI_SCAN	2025-11-27 07:38:03.289	2025-11-27 07:38:03.289	50e309cb-43ea-48ab-8e2a-85d1cfb6dce8
987a970c-629f-498d-b46b-a5a820ea471e	93.79	CAD	3	2025-09-03	Purchase at The Up Cycle	The Up Cycle	EXPENSE	AI_SCAN	2025-11-27 07:38:03.335	2025-11-27 07:38:03.335	50e309cb-43ea-48ab-8e2a-85d1cfb6dce8
dc27b831-e567-4753-ae56-359cae7e3464	26.83	CAD	2	2025-09-02	Groceries from Food Basics	Food Basics	EXPENSE	AI_SCAN	2025-11-27 07:38:03.344	2025-11-27 07:38:03.344	50e309cb-43ea-48ab-8e2a-85d1cfb6dce8
fdc12a0c-1a88-4662-9954-1b4f57f96074	30.98	CAD	2	2025-08-31	Groceries from Foody World	Foody World	EXPENSE	AI_SCAN	2025-11-27 07:38:03.366	2025-11-27 07:38:03.366	50e309cb-43ea-48ab-8e2a-85d1cfb6dce8
eb4c5098-9865-4223-bbc3-a9cd4182e97b	15.41	CAD	2	2025-08-29	Groceries from Skyland Food Mart	Skyland Food Mart	EXPENSE	AI_SCAN	2025-11-27 07:38:03.377	2025-11-27 07:38:03.377	50e309cb-43ea-48ab-8e2a-85d1cfb6dce8
d3ecd827-c587-477a-88f2-466119a3b68b	25.91	CAD	5	2025-08-29	Purchase at Dollarama	Dollarama	EXPENSE	AI_SCAN	2025-11-27 07:39:03.726	2025-11-27 07:39:03.726	50e309cb-43ea-48ab-8e2a-85d1cfb6dce8
ab78a511-3efe-443c-96da-909c010854e0	14.65	CAD	2	2025-08-28	Groceries	Fusion Supermarket	EXPENSE	AI_SCAN	2025-11-27 07:39:03.823	2025-11-27 07:39:03.823	50e309cb-43ea-48ab-8e2a-85d1cfb6dce8
d886f4cd-cfe1-4b38-9121-340dcbea8715	6.44	CAD	2	2025-08-29	Purchase at Walmart	Walmart	EXPENSE	AI_SCAN	2025-11-27 07:39:03.83	2025-11-27 07:39:03.83	50e309cb-43ea-48ab-8e2a-85d1cfb6dce8
790cc9d2-5492-4867-8f13-70ab847c37d4	6.77	CAD	4	2025-08-28	Purchase at Value Village	Value Village	EXPENSE	AI_SCAN	2025-11-27 07:39:03.848	2025-11-27 07:39:03.848	50e309cb-43ea-48ab-8e2a-85d1cfb6dce8
d94d7999-9ee5-4e04-b2c4-8144c91abbd0	1290.46	CAD	4	2025-09-19	iPhone 17	Apple	EXPENSE	AI_SCAN	2025-11-27 07:42:08.528	2025-11-27 07:42:08.528	50e309cb-43ea-48ab-8e2a-85d1cfb6dce8
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: user
--

COPY public.users (id, email, password, name, role, "createdAt", "updatedAt") FROM stdin;
50e309cb-43ea-48ab-8e2a-85d1cfb6dce8	billy061005@gmail.com	agupD5ENI25aWC3	BillyXu	ADMIN	2025-11-28 02:13:07.631	2025-11-28 05:10:50.487
\.


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: recurring_rules recurring_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.recurring_rules
    ADD CONSTRAINT recurring_rules_pkey PRIMARY KEY (id);


--
-- Name: settings settings_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_pkey PRIMARY KEY (id);


--
-- Name: transactions transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: categories_userId_idx; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX "categories_userId_idx" ON public.categories USING btree ("userId");


--
-- Name: recurring_rules_userId_idx; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX "recurring_rules_userId_idx" ON public.recurring_rules USING btree ("userId");


--
-- Name: settings_userId_key; Type: INDEX; Schema: public; Owner: user
--

CREATE UNIQUE INDEX "settings_userId_key" ON public.settings USING btree ("userId");


--
-- Name: transactions_userId_idx; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX "transactions_userId_idx" ON public.transactions USING btree ("userId");


--
-- Name: users_email_key; Type: INDEX; Schema: public; Owner: user
--

CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);


--
-- Name: categories categories_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT "categories_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: recurring_rules recurring_rules_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.recurring_rules
    ADD CONSTRAINT "recurring_rules_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: settings settings_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT "settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: transactions transactions_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT "transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict 8AeBJUprqgudWNEpyxZuHOr0qwNuxkXEBVPHjD0rt71O8zIafcMXJcaa9UeLJBE

