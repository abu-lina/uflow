/**
 * @fileoverview Type definitions for service worker
 * @module lib/service-worker/types
 */

/// <reference lib="webworker" />

export interface ExtendableEvent extends Event {
  waitUntil(promise: Promise<void>): void;
}

export interface FetchEvent extends ExtendableEvent {
  request: Request;
  respondWith(response: Promise<Response> | Response): void;
}

export interface SyncEvent extends ExtendableEvent {
  tag: string;
}

export interface PushEvent extends ExtendableEvent {
  data?: PushMessageData;
}

export interface NotificationEvent extends ExtendableEvent {
  notification: Notification;
  action?: string;
}

export interface PushMessageData {
  text(): string;
  json(): unknown;
  arrayBuffer(): ArrayBuffer;
  blob(): Blob;
}

export interface NotificationOptions {
  body?: string;
  icon?: string;
  badge?: string;
  actions?: NotificationAction[];
}

export interface NotificationAction {
  action: string;
  title: string;
}

export interface OfflineForm {
  id: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string;
}

export interface IDBDatabaseWithStore extends IDBDatabase {
  getAll(storeName: string): Promise<OfflineForm[]>;
  delete(storeName: string, key: IDBValidKey): Promise<void>;
}

export interface ServiceWorkerGlobalScope extends WorkerGlobalScope {
  registration: ServiceWorkerRegistration;
  clients: Clients;
  caches: CacheStorage;
  addEventListener<K extends keyof ServiceWorkerEventMap>(
    type: K,
    listener: (this: ServiceWorkerGlobalScope, ev: ServiceWorkerEventMap[K]) => void,
    options?: boolean | AddEventListenerOptions
  ): void;
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions
  ): void;
}

export interface Clients {
  matchAll(options?: { type?: 'window' | 'worker' | 'sharedworker' | 'all' }): Promise<Client[]>;
  openWindow(url: string): Promise<WindowClient | null>;
}

export interface Client {
  id: string;
  type: 'window' | 'worker' | 'sharedworker';
  url: string;
  focus(): Promise<WindowClient>;
}

export interface WindowClient extends Client {
  focused: boolean;
  visibilityState: DocumentVisibilityState;
  focus(): Promise<WindowClient>;
}

export interface ServiceWorkerEventMap {
  install: ExtendableEvent;
  activate: ExtendableEvent;
  fetch: FetchEvent;
  sync: SyncEvent;
  push: PushEvent;
  notificationclick: NotificationEvent;
} 