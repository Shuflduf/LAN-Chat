import { page } from '$app/state';
import { env } from '$env/dynamic/public';
import { Avatars, Client, Databases, Storage } from 'appwrite';

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

export function channelFromId(id: string): Channel | undefined {
  const ls = safeLocalStorage()
  if (!ls) return
  const channels = ls.getItem('saved_channels');
  if (channels == null) {
    ls.setItem('saved_channels', JSON.stringify([mainChannel()]));
    return mainChannel();
  } else {
    const allSavedChannels = JSON.parse(channels);
    return allSavedChannels.find((c: Channel) => c.id == id);
  }
}

export function mainChannel(): Channel {
  return new Channel(env.PUBLIC_MAIN_CHANNEL_ID, 'Main', null, null, null);
}

// export function getCurrentChannel(): Channel | undefined {
//   const channel = savedChannels.find((c) => c.id == currentChannelId);
//   return channel;
// }
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
  return page.url.searchParams.get("c") ?? env.PUBLIC_MAIN_CHANNEL_ID
}

export function getUsername(): string {
  const ls = safeLocalStorage()
  if (!ls) return ""
  const username = ls.getItem("username")
  return username ? username : ""
}

export function getCurrentChannel(): Channel | undefined {
  const res = channelFromId(getCurrentChannelId())
  return res
}

export function getChannelPassword(id: string): string {
  const channels = localStorage.getItem("saved_channels")
  if (channels) {
    return JSON.parse(channels).find((c: Channel) => c.id == id)?.savedPassword
  }
  return ""
}

export function getAvatarId(): string | null {
  const avatarId = localStorage.getItem("avatar_id")
  return avatarId
}

export function getSavedChannels(): Channel[] {
  const ls = safeLocalStorage()
  if (!ls) return [mainChannel()]
  const channels = ls.getItem('saved_channels');
  if (channels) {
    return JSON.parse(channels);
  }
  return [mainChannel()];
}
export function isChannelSaved(channel: Channel): boolean {
  const savedChannels = getSavedChannels();
  const saved = savedChannels.map((c) => c.id).includes(channel.id);
  return saved;
}

export function saveChannel(channel: Channel) {
  const prevChannels = localStorage.getItem('saved_channels');
  let newChannels = [mainChannel()];
  if (prevChannels) {
    newChannels = JSON.parse(prevChannels);
  }
  newChannels.push(channel);
  localStorage.setItem('saved_channels', JSON.stringify(newChannels));
}

export function safeLocalStorage(): globalThis.Storage | undefined {
  if (typeof localStorage == "undefined") {
    return undefined
  }
  return localStorage
}
