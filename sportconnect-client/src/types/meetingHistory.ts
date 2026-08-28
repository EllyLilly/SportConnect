export interface MeetingHistoryItem {
  id: string;
  title: string;
  sportName: string;
  sportColor: string;
  status: number;
  scheduledAt: string;
  participantsCount: number;
  maxParticipants: number;
  isReadOnly: boolean;
  latitude: number;
  longitude: number;
  resultLabel: string;
}