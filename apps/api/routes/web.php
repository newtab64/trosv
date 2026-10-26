<?php

use App\Http\Controllers\AttachmentController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

// Private chat attachments, opened straight in a browser tab via the
// temporary signed URL from MessageResource (60 minutes, no token).
Route::get('/attachments/{message}', [AttachmentController::class, 'show'])
    ->name('attachments.show')->middleware('signed:relative');
