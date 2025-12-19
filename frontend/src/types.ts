export interface RegisterPayload {
  name?: string;
  email: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string | null;
  user: Record<string, unknown> | null;
}

export interface User {
  id: number;
  email: string;
  name?: string | null;
}

export interface QuizChoice {
  id: number;
  text: string;
  is_correct: boolean;
  position: number;
}

export interface QuizQuestion {
  id: number;
  type: 'mcq' | 'tf';
  prompt: string;
  time_limit_ms: number;
  points: number;
  position: number;
  choices: QuizChoice[];
}

export interface Quiz {
  id: number;
  title: string;
  description?: string | null;
  is_public: boolean;
  owner_id: number;
  created_at: string;
  updated_at: string;
  questions: QuizQuestion[];
}

export interface QuizCreateRequest {
  title: string;
  description?: string | null;
  is_public?: boolean;
  questions: Array<{
    type?: 'mcq' | 'tf' | 'ordering' | 'input';
    prompt: string;
    time_limit_ms?: number;
    points?: number;
    position?: number;
    choices: Array<{
      text: string;
      is_correct?: boolean;
      position?: number;
    }>;
  }>;
}

export interface GameSession {
  id: number;
  quiz_id: number;
  host_id: number;
  pin: string;
  status: string;
  report_ready: boolean;
  state_version: number;
  created_at: string;
  updated_at: string;
}

// WebSocket / AsyncAPI types
export type GameClientRole = 'host' | 'player';

export interface JoinOkHost {
  pin: string;
  role: 'host';
}

export interface JoinOkPlayer {
  pin: string;
  role: 'player';
  player_id: number;
  nickname: string;
  player_token?: string;
}

export type JoinOk = JoinOkHost | JoinOkPlayer;

export interface ResumePayload {
  phase: 'lobby' | 'question' | 'leaderboard' | 'finished';
  question_index: number;
  total_questions: number;
  leaderboard?: LeaderboardEntry[];
  current_question?: QuestionStartedPayload;
}

export interface QuestionStartedPayload {
  phase: 'question';
  question_id: number;
  question_index: number;
  total_questions: number;
  prompt: string;
  choices: Array<{ id: number; text: string; position: number }>;
  ends_at_ms: number;
}

export interface QuestionRevealPayload {
  question_id: number;
  correct_choice_ids: number[];
  answers: Array<{
    player_id: number;
    nickname: string;
    choice_id: number | null;
    is_correct: boolean;
    points_awarded: number;
    latency_ms: number | null;
  }>;
  leaderboard: LeaderboardEntry[];
}

export interface LeaderboardEntry {
  player_id: number;
  nickname: string;
  score: number;
}
