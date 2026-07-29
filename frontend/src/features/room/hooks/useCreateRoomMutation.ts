import { useMutation } from '@tanstack/react-query';

import { createRoom, type CreateRoomRequest } from '../api/roomApi';

export function useCreateRoomMutation() {
  return useMutation({
    mutationFn: (body: CreateRoomRequest) => createRoom(body),
  });
}
