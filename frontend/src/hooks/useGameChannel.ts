import { useEffect, useMemo, useRef, useState } from 'react';
import { Socket } from 'phoenix';
import { useSession } from '../state/session';
import type {
  GameClientRole,
  JoinOk,
  JoinOkPlayer,
  LeaderboardEntry,
  QuestionRevealPayload,
  QuestionStartedPayload,
  ResumePayload
} from '../types';

type GameState =
  | { phase: 'idle'; join?: JoinOk }
  | { phase: 'lobby'; join: JoinOk }
  | { phase: 'leaderboard'; join: JoinOk; resume: ResumePayload }
  | { phase: 'question'; join: JoinOk; data: QuestionStartedPayload }
  | { phase: 'reveal'; join: JoinOk; question: QuestionStartedPayload; reveal: QuestionRevealPayload }
  | { phase: 'finished'; join: JoinOk; leaderboard: LeaderboardEntry[] };

type UseGameChannelOptions = {
  pin: string;
  role: GameClientRole;
  nickname?: string;
};

type Commands = {
  hostStart: () => Promise<void>;
  nextQuestion: () => Promise<void>;
  submitAnswer: (question_id: number, choice_id: number) => Promise<void>;
};

export function useGameChannel({ pin, role, nickname }: UseGameChannelOptions): {
  state: GameState;
  error: string | null;
  commands: Commands;
  connecting: boolean;
  players: Array<{ player_id?: number; nickname: string }>;
} {
  const { session } = useSession();
  const [state, setState] = useState<GameState>({ phase: 'idle' });
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(true);
  const channelRef = useRef<ReturnType<Socket['channel']> | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const [players, setPlayers] = useState<Array<{ player_id?: number; nickname: string }>>([]);
  const joinedRef = useRef(false);

  const playerTokenKey = useMemo(() => `quiz_player_token_${pin}`, [pin]);

  const savePlayerToken = (payload: JoinOkPlayer | null) => {
    if (payload?.player_token) {
      try {
        localStorage.setItem(playerTokenKey, payload.player_token);
      } catch {
        /* ignore */
      }
    }
  };

  const readPlayerToken = () => {
    try {
      return localStorage.getItem(playerTokenKey);
    } catch {
      return null;
    }
  };

  const wsUrl = useMemo(() => {
    const apiBase = session.apiBase || 'http://localhost:4000/api';
    const base = apiBase.replace(/\/api$/, '');
    return base.replace(/^http/, 'ws') + '/socket';
  }, [session.apiBase]);

  useEffect(() => {
    // Log socket creation for debugging websocket issues
    // eslint-disable-next-line no-console
    console.log('[WS CONNECT]', wsUrl, { pin, role, nickname });
    joinedRef.current = false;
    const socket = new Socket(wsUrl, {
      params:
        role === 'host'
          ? { token: session.token || undefined }
          : { nickname, player_token: readPlayerToken() || undefined }
    });
    socket.connect();
    socketRef.current = socket;

    const channel = socket.channel(`game:${pin}`, {});
    channelRef.current = channel;

    channel
      .join()
      .receive('ok', (payload: JoinOk & { resume?: ResumePayload }) => {
        // eslint-disable-next-line no-console
        console.log('[WS JOIN OK]', payload);
        joinedRef.current = true;
        if (payload.role === 'player') {
          savePlayerToken(payload as JoinOkPlayer);
        }

        if (payload.resume?.phase === 'question' && payload.resume.current_question) {
          setState({ phase: 'question', join: payload, data: payload.resume.current_question });
        } else if (payload.resume?.phase === 'leaderboard') {
          setState({ phase: 'leaderboard', join: payload, resume: payload.resume });
        } else if (payload.resume?.phase === 'finished' && payload.resume.leaderboard) {
          setState({ phase: 'finished', join: payload, leaderboard: payload.resume.leaderboard });
        } else {
          setState({ phase: 'lobby', join: payload });
        }
        if (payload.role === 'player') {
          setPlayers((prev) => {
            const exists = prev.some((p) => p.nickname === payload.nickname && p.player_id === payload.player_id);
            return exists ? prev : [...prev, { player_id: payload.player_id, nickname: payload.nickname }];
          });
        } else if (Array.isArray((payload as any).players)) {
          setPlayers((payload as any).players);
        }
        setConnecting(false);
      })
      .receive('error', (payload: { reason: string }) => {
        setError(payload?.reason || 'Failed to join');
        joinedRef.current = false;
        setConnecting(false);
      });

    channel.on('player_joined', (payload: { player_id?: number; nickname: string }) => {
      // eslint-disable-next-line no-console
      console.log('[WS EVENT] player_joined', payload);
      setPlayers((prev) => {
        const exists = prev.some((p) => (payload.player_id ? p.player_id === payload.player_id : p.nickname === payload.nickname));
        return exists ? prev : [...prev, payload];
      });
    });

    channel.on('player_left', (payload: { player_id?: number; nickname?: string }) => {
      // eslint-disable-next-line no-console
      console.log('[WS EVENT] player_left', payload);
      setPlayers((prev) =>
        prev.filter((p) => {
          if (payload.player_id) return p.player_id !== payload.player_id;
          if (payload.nickname) return p.nickname !== payload.nickname;
          return true;
        })
      );
    });

    channel.on('question_started', (payload: QuestionStartedPayload) => {
      // eslint-disable-next-line no-console
      console.log('[WS EVENT] question_started', payload);
      joinedRef.current = true;
      setState((prev) => {
        const join = (prev as any).join || { pin, role };
        return { phase: 'question', join, data: payload };
      });
    });

    channel.on('question_reveal', (payload: QuestionRevealPayload) => {
      // eslint-disable-next-line no-console
      console.log('[WS EVENT] question_reveal', payload);
      joinedRef.current = true;
      setState((prev) => {
        if (prev.phase === 'question') {
          return { phase: 'reveal', join: prev.join, question: prev.data, reveal: payload };
        }
        if (prev.phase === 'reveal') {
          return { phase: 'reveal', join: prev.join, question: prev.question, reveal: payload };
        }
        return prev;
      });
    });

    channel.on('game_finished', (payload: { leaderboard: LeaderboardEntry[] }) => {
      // eslint-disable-next-line no-console
      console.log('[WS EVENT] game_finished', payload);
      joinedRef.current = true;
      setState((prev) => ({
        phase: 'finished',
        join: (prev as any).join || { pin, role },
        leaderboard: payload.leaderboard
      }));
    });

    channel.on('error', (payload: { reason: string }) => {
      // eslint-disable-next-line no-console
      console.error('[WS EVENT] error', payload);
      joinedRef.current = false;
      setError(payload.reason || 'Error');
    });

    return () => {
      // eslint-disable-next-line no-console
      console.log('[WS DISCONNECT]');
      joinedRef.current = false;
      channel.leave();
      socket.disconnect();
    };
  }, [pin, role, wsUrl, session.token, nickname]);

  const pushCommand = useMemo(
    () => (event: string, payload: Record<string, unknown>) => {
      return new Promise<void>((resolve) => {
        if (!channelRef.current) {
          setError('Not connected to game yet');
          // eslint-disable-next-line no-console
          console.warn('[WS SEND FAILED] not joined', event, payload);
          resolve();
          return;
        }
        // eslint-disable-next-line no-console
        console.log('[WS SEND]', event, payload);
        channelRef.current
          .push(event, payload)
          .receive('ok', (resp) => {
            // eslint-disable-next-line no-console
            console.log('[WS OK]', event, resp);
            resolve();
          })
          .receive('error', (resp) => {
            // eslint-disable-next-line no-console
            console.error('[WS ERROR]', event, resp);
            setError((resp as any)?.reason || 'Command failed');
            resolve();
          });
      });
    },
    []
  );

  const commands = useMemo<Commands>(
    () => ({
      hostStart: () => pushCommand('host_start', {}),
      nextQuestion: () => pushCommand('next_question', {}),
      submitAnswer: (question_id: number, choice_id: number) => pushCommand('submit_answer', { question_id, choice_id })
    }),
    [pushCommand]
  );

  return { state, error, commands, connecting, players };
}
