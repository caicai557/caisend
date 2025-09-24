export interface User {
  id: string;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  bio?: string;
  avatar?: string;
  phone?: string;
  last_seen: string;
  is_online: boolean;
  is_verified: boolean;
  is_active: boolean;
  settings?: UserSettings;
  created_at: string;
  updated_at: string;
}

export interface UserSettings {
  notifications: {
    message: boolean;
    mention: boolean;
    group: boolean;
  };
  privacy: {
    last_seen: 'everyone' | 'contacts' | 'nobody';
    profile_photo: 'everyone' | 'contacts' | 'nobody';
    status: 'everyone' | 'contacts' | 'nobody';
  };
  theme: 'light' | 'dark';
  language: string;
}

export interface Chat {
  id: string;
  name?: string;
  description?: string;
  type: 'private' | 'group' | 'channel' | 'saved';
  avatar?: string;
  created_by: string;
  is_public: boolean;
  invite_link?: string;
  member_count: number;
  pinned_message_id?: string;
  settings?: ChatSettings;
  last_message_at?: string;
  last_message?: Message;
  is_archived: boolean;
  is_deleted: boolean;
  is_muted?: boolean;
  is_pinned?: boolean;
  unread_count?: number;
  members?: User[];
  typingUsers?: string[];
  created_at: string;
  updated_at: string;
}

export interface ChatSettings {
  mute_notifications: boolean;
  auto_delete_messages?: number;
  allow_member_invites: boolean;
  require_admin_approval: boolean;
  slow_mode_seconds: number;
}

export interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  sender?: User;
  content?: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'file' | 'location' | 'contact' | 'sticker' | 'poll' | 'system';
  reply_to_id?: string;
  replyTo?: Message;
  forwarded_from_id?: string;
  edited_at?: string;
  is_edited: boolean;
  is_deleted: boolean;
  is_pinned: boolean;
  metadata?: any;
  reactions?: { [emoji: string]: string[] };
  read_by: string[];
  delivered_to: string[];
  files?: FileAttachment[];
  created_at: string;
  updated_at: string;
}

export interface ChatMember {
  id: string;
  chat_id: string;
  user_id: string;
  user?: User;
  role: 'owner' | 'admin' | 'member';
  joined_at: string;
  last_read_message_id?: string;
  unread_count: number;
  is_muted: boolean;
  muted_until?: string;
  is_pinned: boolean;
  is_archived: boolean;
  is_blocked: boolean;
  permissions: MemberPermissions;
  created_at: string;
  updated_at: string;
}

export interface MemberPermissions {
  send_messages: boolean;
  send_media: boolean;
  add_members: boolean;
  change_info: boolean;
  pin_messages: boolean;
  delete_messages: boolean;
}

export interface FileAttachment {
  id: string;
  message_id?: string;
  uploaded_by: string;
  filename: string;
  original_name: string;
  mime_type: string;
  size: number;
  path: string;
  url?: string;
  thumbnail_path?: string;
  thumbnail_url?: string;
  duration?: number;
  width?: number;
  height?: number;
  metadata?: any;
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: string;
  user_id: string;
  contact_user_id: string;
  contactUser?: User;
  nickname?: string;
  is_blocked: boolean;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}

export interface Call {
  id: string;
  chat_id: string;
  type: 'voice' | 'video';
  initiator_id: string;
  participants: CallParticipant[];
  started_at: string;
  ended_at?: string;
  duration?: number;
}

export interface CallParticipant {
  user_id: string;
  user?: User;
  joined_at: string;
  left_at?: string;
  is_muted: boolean;
  is_video_on: boolean;
}

export interface Notification {
  id: string;
  user_id: string;
  type: 'message' | 'mention' | 'call' | 'group_invite' | 'system';
  title: string;
  body: string;
  data?: any;
  is_read: boolean;
  created_at: string;
}

export interface SearchResult {
  messages: Message[];
  chats: Chat[];
  users: User[];
}