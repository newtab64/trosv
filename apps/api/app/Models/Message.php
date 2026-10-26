<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Message extends Model
{
    use HasFactory;

    protected $fillable = [
        'conversation_id',
        'sender_id',
        'body',
        'attachment_path',
        'attachment_name',
        'read_at',
        'deleted_at',
        'deleted_for_user_ids',
        'seen_at',
        'reactions',
    ];

    protected function casts(): array
    {
        return [
            'read_at' => 'datetime',
            'deleted_at' => 'datetime',
            'seen_at' => 'datetime',
            'deleted_for_user_ids' => 'array',
            'reactions' => 'array',
        ];
    }

    /** Facebook "Thu hồi": đã unsend cho mọi người chưa. */
    public function isUnsent(): bool
    {
        return $this->deleted_at !== null;
    }

    /** Message này bị ẩn với user id $userId không (delete-for-me)? */
    public function isHiddenFor(int $userId): bool
    {
        return in_array($userId, $this->deleted_for_user_ids ?? [], true);
    }

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(Conversation::class);
    }

    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sender_id');
    }
}
