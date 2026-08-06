package com.wecandoit.mission.domain;

import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.IntStream;

/**
 * Stateless allocation of bingo board cells across mission buckets.
 *
 * <p>The photo verification axis and the difficulty axis are allocated independently, each in
 * proportion to the live active mission pool composition, using the largest remainder method so
 * that the allocated cells add up to the requested cell count. When a single bucket holds fewer
 * missions than its quota, the shortfall is moved to another difficulty of the same type.
 */
public final class MissionQuotaAllocator {

    private static final MissionDifficulty[] DIFFICULTIES = MissionDifficulty.values();

    private MissionQuotaAllocator() {
    }

    /**
     * Allocates {@code cellCount} cells over the buckets described by {@code availableByBucket}.
     * The returned map only holds buckets with a positive quota, and its values add up to
     * {@code cellCount} unless the whole pool holds fewer missions than that.
     */
    public static Map<MissionBucket, Integer> allocate(
            Map<MissionBucket, Long> availableByBucket,
            int cellCount
    ) {
        long[] photoVerifiedAvailability = availabilityByDifficulty(availableByBucket, true);
        long[] nonPhotoVerifiedAvailability = availabilityByDifficulty(availableByBucket, false);
        long[] difficultyWeights = new long[DIFFICULTIES.length];
        for (int index = 0; index < DIFFICULTIES.length; index++) {
            difficultyWeights[index] = photoVerifiedAvailability[index] + nonPhotoVerifiedAvailability[index];
        }

        int[] typeQuotas = distributeByLargestRemainder(cellCount, new long[]{
                sum(photoVerifiedAvailability),
                sum(nonPhotoVerifiedAvailability)
        });

        Map<MissionBucket, Integer> quotas = new LinkedHashMap<>();
        putPositiveQuotas(
                quotas,
                true,
                difficultyQuotas(typeQuotas[0], difficultyWeights, photoVerifiedAvailability)
        );
        putPositiveQuotas(
                quotas,
                false,
                difficultyQuotas(typeQuotas[1], difficultyWeights, nonPhotoVerifiedAvailability)
        );
        return quotas;
    }

    private static long[] availabilityByDifficulty(
            Map<MissionBucket, Long> availableByBucket,
            boolean photoVerified
    ) {
        long[] availability = new long[DIFFICULTIES.length];
        for (int index = 0; index < DIFFICULTIES.length; index++) {
            availability[index] = availableByBucket.getOrDefault(
                    new MissionBucket(photoVerified, DIFFICULTIES[index]),
                    0L
            );
        }
        return availability;
    }

    private static int[] difficultyQuotas(int typeQuota, long[] difficultyWeights, long[] availability) {
        int[] quotas = distributeByLargestRemainder(typeQuota, difficultyWeights);
        int assigned = 0;
        for (int index = 0; index < quotas.length; index++) {
            quotas[index] = (int) Math.min(quotas[index], availability[index]);
            assigned += quotas[index];
        }
        while (assigned < typeQuota) {
            int spareIndex = indexWithLargestSpareCapacity(quotas, availability);
            if (spareIndex < 0) {
                break;
            }
            quotas[spareIndex]++;
            assigned++;
        }
        return quotas;
    }

    private static int[] distributeByLargestRemainder(int total, long[] weights) {
        int[] quotas = new int[weights.length];
        long weightSum = sum(weights);
        if (total == 0 || weightSum == 0) {
            return quotas;
        }
        long[] remainders = new long[weights.length];
        int assigned = 0;
        for (int index = 0; index < weights.length; index++) {
            long numerator = (long) total * weights[index];
            quotas[index] = (int) (numerator / weightSum);
            remainders[index] = numerator % weightSum;
            assigned += quotas[index];
        }
        for (int index : indexesByLargestRemainder(remainders, total - assigned)) {
            quotas[index]++;
        }
        return quotas;
    }

    private static List<Integer> indexesByLargestRemainder(long[] remainders, int limit) {
        return IntStream.range(0, remainders.length)
                .boxed()
                .sorted(Comparator.comparingLong((Integer index) -> remainders[index]).reversed())
                .limit(limit)
                .toList();
    }

    private static int indexWithLargestSpareCapacity(int[] quotas, long[] availability) {
        int selectedIndex = -1;
        long largestSpareCapacity = 0;
        for (int index = 0; index < quotas.length; index++) {
            long spareCapacity = availability[index] - quotas[index];
            if (spareCapacity > largestSpareCapacity) {
                largestSpareCapacity = spareCapacity;
                selectedIndex = index;
            }
        }
        return selectedIndex;
    }

    private static void putPositiveQuotas(
            Map<MissionBucket, Integer> quotas,
            boolean photoVerified,
            int[] difficultyQuotas
    ) {
        for (int index = 0; index < DIFFICULTIES.length; index++) {
            if (difficultyQuotas[index] > 0) {
                quotas.put(new MissionBucket(photoVerified, DIFFICULTIES[index]), difficultyQuotas[index]);
            }
        }
    }

    private static long sum(long[] values) {
        long total = 0;
        for (long value : values) {
            total += value;
        }
        return total;
    }
}
