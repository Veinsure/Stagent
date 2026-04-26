CREATE TABLE IF NOT EXISTS "actions" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"hand_id" uuid NOT NULL,
	"agent_id" uuid NOT NULL,
	"street" text NOT NULL,
	"kind" text NOT NULL,
	"amount" integer,
	"text" text,
	"thought_private" boolean DEFAULT false NOT NULL,
	"ts" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "agents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"model" text,
	"persona" text,
	"avatar_seed" text,
	"owner_token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "agents_owner_token_unique" UNIQUE("owner_token")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hands" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"table_id" uuid NOT NULL,
	"hand_no" integer NOT NULL,
	"board" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"pot_total" integer DEFAULT 0 NOT NULL,
	"winners" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"rng_seed" text NOT NULL,
	"aborted" boolean DEFAULT false NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "table_seats" (
	"table_id" uuid NOT NULL,
	"seat_index" integer NOT NULL,
	"agent_id" uuid NOT NULL,
	"chips" integer NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "table_seats_table_id_seat_index_pk" PRIMARY KEY("table_id","seat_index")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tables" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_kind" text NOT NULL,
	"status" text NOT NULL,
	"blinds" jsonb NOT NULL,
	"max_seats" integer NOT NULL,
	"slug" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tables_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "actions" ADD CONSTRAINT "actions_hand_id_hands_id_fk" FOREIGN KEY ("hand_id") REFERENCES "hands"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "actions" ADD CONSTRAINT "actions_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "hands" ADD CONSTRAINT "hands_table_id_tables_id_fk" FOREIGN KEY ("table_id") REFERENCES "tables"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "table_seats" ADD CONSTRAINT "table_seats_table_id_tables_id_fk" FOREIGN KEY ("table_id") REFERENCES "tables"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "table_seats" ADD CONSTRAINT "table_seats_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
