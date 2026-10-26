<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>TROSV API</title>
        <link rel="preconnect" href="https://fonts.bunny.net">
        <link href="https://fonts.bunny.net/css?family=figtree:400,600&display=swap" rel="stylesheet" />
        <style>
            body {
                font-family: Figtree, ui-sans-serif, system-ui, sans-serif;
                background-color: #faf8f5;
                color: #17171c;
                display: flex;
                min-height: 100vh;
                align-items: center;
                justify-content: center;
                margin: 0;
            }
            .card {
                background: #ffffff;
                border: 1px solid #e5e7eb;
                border-radius: 16px;
                padding: 36px 32px;
                text-align: center;
                max-width: 440px;
                box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
            }
            .logo {
                display: block;
                margin: 0 auto 16px;
            }
            h1 {
                font-size: 22px;
                font-weight: 600;
                margin: 0 0 8px;
            }
            p {
                color: #6b7280;
                font-size: 14px;
                line-height: 1.5;
                margin: 0;
            }
        </style>
    </head>
    <body>
        <main class="card">
            <img
                class="logo"
                src="https://laravel.com/img/logomark.min.svg"
                alt="Laravel"
                width="48"
                height="48"
            />
            <h1>TROSV API Service</h1>
            <p>Hệ thống Backend API và WebSocket đang hoạt động ổn định.</p>
        </main>
    </body>
</html>
