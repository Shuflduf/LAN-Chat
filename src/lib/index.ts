import { page } from '$app/state';
import { env } from '$env/dynamic/public';
import { Avatars, Client, Databases, ID, Query, Storage } from 'appwrite';

export const client = new Client()
	.setEndpoint(env.PUBLIC_APPWRITE_ENDPOINT)
	.setProject(env.PUBLIC_APPWRITE_PROJECT_ID);
export const databases = new Databases(client);
export const avatars = new Avatars(client);
export const storage = new Storage(client);

export const imageMimeTypes = [
	'image/png',
	'image/jpeg',
	'image/gif',
	'image/webp',
	'image/svg+xml',
	'image/bmp',
	'image/x-icon',
];

export const videoMimeTypes = [
	'video/mp4',
	'video/webm',
	'video/ogg',
	'video/x-matroska',
	'video/3gpp',
	'video/quicktime',
];

export enum MessageType {
	User,
	System,
	Temp,
}

export class Channel {
	id: string;
	name: string;
	expiration: string;
	password: string | null = null;
	savedPassword: string | null = null;

	constructor(
		id: string,
		name: string,
		expiration: Date | null,
		password: string | null = null,
		savedPassword: string | null = null,
	) {
		this.id = id;
		this.name = name;
		this.expiration = expiration ? expiration.toString() : new Date(2025, 0).toString();

		this.password = password;
		this.savedPassword = savedPassword;
	}
}

export class MessageGroup {
	messages: (Message | null)[];
	username: string;
	avatarId: string | null;
	createdAt: Date;

	constructor(
		messages: (Message | null)[],
		username: string,
		avatarId: string | null,
		createdAt: Date,
	) {
		this.messages = messages;
		this.username = username;
		this.avatarId = avatarId;
		this.createdAt = createdAt;
	}
}

export class MessageFile {
	name: string;
	id: string;
	mimeType: string;
	size: number;

	constructor(name: string, id: string, mimeType: string, size: number) {
		this.name = name;
		this.id = id;
		this.mimeType = mimeType;
		this.size = size;
	}

	isImage(): boolean {
		return imageMimeTypes.includes(this.mimeType);
	}

	isVideo(): boolean {
		return videoMimeTypes.includes(this.mimeType);
	}

	formatURL(): string {
		return `https://nyc.cloud.appwrite.io/v1/storage/buckets/message_files/files/${this.id}/view?project=${env.PUBLIC_APPWRITE_PROJECT_ID}`;
	}

	downloadURL(): string {
		return `https://nyc.cloud.appwrite.io/v1/storage/buckets/message_files/files/${this.id}/download?project=${env.PUBLIC_APPWRITE_PROJECT_ID}`;
	}
}

export class Message {
	content: string;
	username: string;
	createdAt: Date;
	id: string;
	avatarId: string | null = null;
	type: MessageType = MessageType.User;
	files: MessageFile[];

	constructor(
		content: string,
		username: string,
		createdAt: Date,
		id: string,
		type: MessageType = MessageType.User,
		avatarId: string | null = null,
		files: MessageFile[],
	) {
		this.content = content;
		this.username = username;
		this.createdAt = createdAt;
		this.id = id;
		this.files = files;

		this.type = type;
		this.avatarId = avatarId;
	}

	mediaFiles(): MessageFile[] {
		return this.files.filter((f) => f.isImage() || f.isVideo());
	}
	notMediaFiles(): MessageFile[] {
		return this.files.filter((f) => !f.isImage() && !f.isVideo());
	}
}

export async function channelFromId(id: string): Promise<Channel | undefined> {
	const ls = safeLocalStorage();
	if (!ls) return;
	const channels = ls.getItem('saved_channels');
	if (channels == null) {
		ls.setItem('saved_channels', JSON.stringify(await defaultChannels()));

		return mainChannel();
	} else {
		const allSavedChannels = JSON.parse(channels);

		return allSavedChannels.find((c: Channel) => c.id == id);
	}
}

export function mainChannel(): Channel {
	return new Channel(env.PUBLIC_MAIN_CHANNEL_ID, 'Main', null, null, null);
}

export function formatDate(date: Date): string {
	const hours = date.getHours();
	const hour12 = hours % 12 || 12;
	const minutes = date.getMinutes().toString().padStart(2, '0');
	const ampm = hours < 12 ? 'AM' : 'PM';

	return `${hour12}:${minutes} ${ampm}`;
}

export function formatAvatarURI(id: string): string {
	return `https://nyc.cloud.appwrite.io/v1/storage/buckets/profiles/files/${id}/view?project=${env.PUBLIC_APPWRITE_PROJECT_ID}`;
}

export function formatBytes(bytes: number): string {
	const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
	if (bytes === 0) return '0 B';
	const i = Math.floor(Math.log(bytes) / Math.log(1024));
	const value = bytes / Math.pow(1024, i);
	return `${value.toFixed(2)} ${sizes[i]}`;
}

export function getCurrentChannelId(): string {
	return page.url.searchParams.get('c') ?? env.PUBLIC_MAIN_CHANNEL_ID;
}

export function getUsername(): string {
	const ls = safeLocalStorage();
	if (!ls) return '';
	const username = ls.getItem('username');
	return username ? username : '';
}

export async function getCurrentChannel(): Promise<Channel | undefined> {
	const res = await channelFromId(getCurrentChannelId());
	return res;
}

export function unsaveChannel(channel: Channel) {
	const prevChannels = localStorage.getItem('saved_channels');
	if (prevChannels) {
		let newChannels: Channel[] = JSON.parse(prevChannels);
		const targetIndex = newChannels.map((c) => c.id).indexOf(channel.id);
		newChannels.splice(targetIndex, 1);
		localStorage.setItem('saved_channels', JSON.stringify(newChannels));
	}
}

export function getChannelPassword(id: string): string {
	const channels = localStorage.getItem('saved_channels');
	if (channels) {
		return JSON.parse(channels).find((c: Channel) => c.id == id)?.savedPassword;
	}
	return '';
}

export function getAvatarId(): string | null {
	const ls = safeLocalStorage();
	if (!ls) return null;
	const avatarId = ls.getItem('avatar_id');

	return avatarId;
}

export async function getSavedChannels(): Promise<Channel[]> {
	const ls = safeLocalStorage();
	if (!ls) return defaultChannels();
	const channels = ls.getItem('saved_channels');
	if (channels) {
		return JSON.parse(channels);
	}
	return await defaultChannels();
}
export async function isChannelSaved(channel: Channel): Promise<boolean> {
	const savedChannels = await getSavedChannels();
	const saved = savedChannels.map((c: Channel) => c.id).includes(channel.id);
	return saved;
}

export async function saveChannel(channel: Channel) {
	const prevChannels = localStorage.getItem('saved_channels');
	let newChannels = await defaultChannels();
	if (prevChannels) {
		newChannels = JSON.parse(prevChannels);
	}
	newChannels.push(channel);
	localStorage.setItem('saved_channels', JSON.stringify(newChannels));
}

export function safeLocalStorage(): globalThis.Storage | undefined {
	if (typeof localStorage == 'undefined') {
		return undefined;
	}
	return localStorage;
}

export async function getAllChannels(): Promise<Channel[]> {
	const res = await databases.listDocuments('main', env.PUBLIC_CHANNELS_ID);
	return res.documents
		.filter((d) => !d.name.startsWith('Net'))
		.map((d) => new Channel(d.$id, d.name, d.expiration, d.password));
}

export async function defaultChannels(): Promise<Channel[]> {
	return [mainChannel(), await getNetworkChannel()];
}

export async function getNetworkChannel(): Promise<Channel> {
	const ip = await getPublicIp();
	const targetName = `Net ${ip}`;
	const res = await databases.listDocuments('main', env.PUBLIC_CHANNELS_ID, [
		Query.equal('name', targetName),
		Query.limit(1),
	]);
	const channelExists = res.total > 0;
	if (channelExists) {
		const channel = res.documents[0];

		return new Channel(channel.$id, channel.name, new Date(2035, 0));
	}

	const createRes = await databases.createDocument('main', env.PUBLIC_CHANNELS_ID, ID.unique(), {
		name: targetName,
		expiration: new Date(2035, 0),
	});

	return new Channel(createRes.$id, createRes.name, new Date(2035, 0));
}

export async function getPublicIp(): Promise<string> {
	const res = await fetch('https://api.ipify.org?format=json');
	const data = await res.json();
	return data.ip;
}
