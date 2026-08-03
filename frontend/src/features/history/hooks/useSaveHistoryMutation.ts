import { useMutation } from '@tanstack/react-query';

import { saveHistory } from '../api/historyApi';

export function useSaveHistoryMutation() {
  return useMutation({
    mutationFn: saveHistory,
  });
}
