-- CreateEnum
CREATE TYPE "Status" AS ENUM ('OFFLINE', 'ONLINE', 'GAME', 'WATCHING');

-- CreateEnum
CREATE TYPE "MatchResult" AS ENUM ('WINNER', 'LOSER', 'TIE');

-- CreateTable
CREATE TABLE "rooms" (
    "id" SERIAL NOT NULL,
    "roomname" TEXT NOT NULL,
    "users" TEXT NOT NULL,
    "admins" TEXT NOT NULL,
    "muted" TEXT NOT NULL,
    "banned" TEXT NOT NULL,
    "password" TEXT,
    "private" BOOLEAN,

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matches" (
    "id" SERIAL NOT NULL,
    "playerId" INTEGER NOT NULL,
    "against" TEXT NOT NULL,
    "playerScore" INTEGER NOT NULL,
    "enemyScore" INTEGER NOT NULL,
    "result" "MatchResult" NOT NULL,

    CONSTRAINT "matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isNickSet" BOOLEAN NOT NULL DEFAULT false,
    "twoFactorAuth" BOOLEAN NOT NULL DEFAULT false,
    "secret" TEXT,
    "lastSecret" BIGINT,
    "email" TEXT NOT NULL,
    "nickname" TEXT,
    "defaultAvatar" TEXT NOT NULL,
    "customAvatar" TEXT,
    "refreshTokenHash" TEXT,
    "status" "Status" NOT NULL DEFAULT 'OFFLINE',
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "achievements" TEXT[],
    "friends" INTEGER[],
    "blocked" INTEGER[],
    "friendRequests" INTEGER[],

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_roomname_key" ON "rooms"("roomname");

-- CreateIndex
CREATE UNIQUE INDEX "rooms_users_key" ON "rooms"("users");

-- CreateIndex
CREATE UNIQUE INDEX "rooms_admins_key" ON "rooms"("admins");

-- CreateIndex
CREATE UNIQUE INDEX "rooms_muted_key" ON "rooms"("muted");

-- CreateIndex
CREATE UNIQUE INDEX "rooms_banned_key" ON "rooms"("banned");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_nickname_key" ON "users"("nickname");

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
