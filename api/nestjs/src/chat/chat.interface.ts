export enum RoomType
{
	PUBLIC,
	PRIVATE,
	DM,
}

export enum Type{
	USERS,
	ADMINS,
	MUTED,
	BANNED,
}

export enum Status{
	OFFLINE,
	ONLINE,
	GAME,
	WATCHING,
}

export interface Room{
	owner: string;
	users: string[];
	admins: string[];
	muted: Timer[];
	banned: Timer[];
	messages: Message[];
	type: RoomType;
	password?: string;
}

export interface Message{
	user: string;
	message: string;
	gameId: string;
}

export interface Timer{
	user: string;
	timer: Date;
}
