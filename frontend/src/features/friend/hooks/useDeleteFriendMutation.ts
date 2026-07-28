import { useMutation, useQueryClient } from '@tanstack/react-query';

import { deleteFriend } from '../api/friendApi';

export function useDeleteFriendMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (friendId: number) => deleteFriend(friendId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends'] });
    },
  });
}
