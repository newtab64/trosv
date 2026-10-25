<?php

namespace App\Services\Ai;

use App\Models\User;
use App\Services\AiClient;
use Illuminate\Validation\ValidationException;

class RoommateMatcher
{
    public function __construct(private readonly AiClient $ai) {}

    /**
     * Roommate matching: profile must be complete and looking_for_roommate
     * set, otherwise 422. Candidates: other students with intersecting
     * budgets, max 20. Response rows get name/school/phone re-attached by
     * Backend (AI only ever sees the anonymous profile shape).
     *
     * @return list<array<string, mixed>>
     */
    public function match(User $me): array
    {
        if (! $this->profileComplete($me)) {
            throw ValidationException::withMessages([
                'profile' => ['Hãy hoàn thiện hồ sơ và bật tìm bạn cùng phòng.'],
            ]);
        }

        $candidates = User::query()
            ->where('role', User::ROLE_STUDENT)
            ->where('looking_for_roommate', true)
            ->where('id', '!=', $me->id)
            ->where('budget_min', '<=', $me->budget_max)
            ->where('budget_max', '>=', $me->budget_min)
            ->with('school:id,name')
            ->limit(20)
            ->get();

        // The requester comes from the auth guard without eager loads.
        $me->load('school:id,name');
        $myInterests = $this->interestList($me->interests);

        if ($candidates->isEmpty()) {
            return [];
        }

        $response = $this->ai->post('/roommates', [
            'requester' => $this->candidatePayload($me),
            'candidates' => $candidates->map(fn (User $u) => $this->candidatePayload($u))->all(),
            'limit' => 5,
        ], ['results']);

        // Keep only ids that are actually in the candidate set (contract §4),
        // cap at 5 and re-attach the personal fields Backend owns.
        $byId = $candidates->keyBy('id');
        $results = [];
        foreach ($response['results'] as $row) {
            $candidate = $byId->get($row['id'] ?? null);
            if ($candidate === null || count($results) >= 5) {
                continue;
            }

            $results[] = [
                'user_id' => $candidate->id,
                'name' => $candidate->name,
                'school' => $candidate->school?->name,
                'phone' => $candidate->phone,
                'interests' => $this->interestList($candidate->interests),
                'interests_shared' => array_values(
                    array_intersect($myInterests, $this->interestList($candidate->interests))
                ),
                'score' => is_numeric($row['score'] ?? null) ? (int) $row['score'] : 0,
                'reason' => is_string($row['reason'] ?? null) ? $row['reason'] : '',
            ];
        }

        // Ưu tiên ứng viên trùng nhiều sở thích nhất với người yêu cầu;
        // hòa nhau thì theo score của AI, rồi theo id để ổn định.
        usort($results, fn (array $a, array $b) => count($b['interests_shared']) <=> count($a['interests_shared'])
            ?: $b['score'] <=> $a['score']
            ?: $a['user_id'] <=> $b['user_id']);

        return $results;
    }

    /** The AI contract profile shape - no name, email or phone here. */
    private function candidatePayload(User $user): array
    {
        return [
            'id' => $user->id,
            'budget_min' => (int) $user->budget_min,
            'budget_max' => (int) $user->budget_max,
            'sleep_schedule' => $user->sleep_schedule,
            'cleanliness' => $user->cleanliness !== null ? (int) $user->cleanliness : null,
            'smoking' => (bool) $user->smoking,
            'personality' => $user->personality,
            'interests' => $this->interestList($user->interests),
        ];
    }

    /**
     * "music, gym" -> ["music", "gym"] (null -> []).
     *
     * @return list<string>
     */
    private function interestList(?string $csv): array
    {
        return $csv !== null
            ? array_values(array_filter(array_map('trim', explode(',', $csv))))
            : [];
    }

    private function profileComplete(User $user): bool
    {
        return $user->school_id !== null
            && $user->budget_min !== null
            && $user->budget_max !== null
            && $user->sleep_schedule !== null
            && $user->cleanliness !== null
            && $user->smoking !== null
            && $user->personality !== null
            && $user->looking_for_roommate === true;
    }
}
