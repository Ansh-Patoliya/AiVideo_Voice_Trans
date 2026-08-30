export type MediaStatus =
  | 'UPLOADING'
  | 'QUEUED'
  | 'PROCESSING'
  | 'EXTRACTING_AUDIO'
  | 'TRANSCRIBING'
  | 'SAVING'
  | 'COMPLETED'
  | 'FAILED';

export type SourceType =
  | 'upload'
  | 'youtube'
  | 'youtube_shorts'
  | 'instagram'
  | 'facebook'
  | 'facebook_ad_library'
  | 'direct_url';

export interface User {
  id: number;
  email: string;
  full_name?: string;
  created_at: string;
}

export interface MediaItem {
  id: number;
  user_id: number;
  title: string;
  source_type: SourceType;
  source_url?: string;
  cloudinary_public_id?: string;
  cloudinary_url?: string;
  local_media_path?: string;
  media_type: 'video' | 'audio';
  mime_type?: string;
  duration?: number;
  file_size?: number;
  language?: string;
  status: MediaStatus;
  error_message?: string;
  is_favourite?: boolean;
  is_pinned?: boolean;
  created_at: string;
  updated_at: string;
}

export interface TranscriptSegment {
  id: number;
  transcript_id: number;
  start_time: number;
  end_time: number;
  text: string;
  speaker?: string | null;
  sequence: number;
  created_at?: string;
  updated_at?: string;
}

export interface ImportantSection {
  timestamp: number;
  formatted_time: string;
  title: string;
  reason: string;
}

export interface Transcript {
  id: number;
  media_id: number;
  language: string;
  full_text: string;
  summary?: string | null;
  key_points?: string[] | null;
  keywords?: string[] | null;
  important_sections?: ImportantSection[] | null;
  segments: TranscriptSegment[];
  created_at: string;
  updated_at: string;
}

export interface Bookmark {
  id: number;
  media_id: number;
  user_id: number;
  timestamp: number;
  label: string;
  note?: string | null;
  created_at: string;
}

export interface Note {
  id: number;
  media_id: number;
  user_id: number;
  timestamp?: number | null;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface SearchResultItem {
  media_id: number;
  media_title: string;
  media_type: string;
  source_type: string;
  match_type: 'title' | 'transcript' | 'note' | 'bookmark';
  matched_text: string;
  timestamp?: number;
  created_at: string;
}

export interface SearchResponse {
  query: string;
  total_results: number;
  results: SearchResultItem[];
}
