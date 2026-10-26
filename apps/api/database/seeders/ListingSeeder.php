<?php

namespace Database\Seeders;

use App\Models\Amenity;
use App\Models\City;
use App\Models\Listing;
use App\Models\ListingImage;
use App\Models\School;
use App\Models\User;
use App\Models\Ward;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Storage;
use Intervention\Image\Drivers\Gd\Driver;
use Intervention\Image\Encoders\JpegEncoder;
use Intervention\Image\ImageManager;

class ListingSeeder extends Seeder
{
    public function run(): void
    {
        $landlords = User::where('role', User::ROLE_LANDLORD)->orderBy('id')->get();
        $amenityIds = Amenity::orderBy('id')->pluck('id')->all();

        // Xóa các ảnh seed cũ để không tích tụ file rác
        Storage::disk('public')->delete(Storage::disk('public')->files('listings'));

        $manager = null;
        if (extension_loaded('gd')) {
            $manager = new ImageManager(new Driver);
        }

        // 3 thành phố mục tiêu
        $cities = City::whereIn('name', ['TP.HCM', 'Hà Nội', 'Đà Nẵng'])->orderBy('id')->get();

        $streetNames = [
            'Hà Nội' => [
                'Đường Xuân Thủy', 'Đường Hồ Tùng Mậu', 'Đường Đại Cồ Việt', 'Đường Giải Phóng',
                'Đường Chùa Láng', 'Đường Chùa Bộc', 'Phố Tôn Thất Tùng', 'Đường Nguyễn Trãi',
                'Đường Cầu Giấy', 'Đường Trần Đại Nghĩa', 'Đường Lê Thanh Nghị', 'Đường Duy Tân',
            ],
            'TP.HCM' => [
                'Đường Lý Thường Kiệt', 'Đường Nguyễn Văn Cừ', 'Đường Đinh Tiên Hoàng', 'Đường Võ Văn Ngân',
                'Đường Điện Biên Phủ', 'Đường Nguyễn Hữu Thọ', 'Đường An Dương Vương', 'Đường Đặng Thùy Trâm',
                'Đường Nguyễn Văn Bảo', 'Đường D2 (Nguyễn Gia Trí)', 'Đường Tô Hiến Thành', 'Đường Sư Vạn Hạnh',
            ],
            'Đà Nẵng' => [
                'Đường Nguyễn Lương Bằng', 'Đường Ngũ Hành Sơn', 'Đường Tôn Đức Thắng', 'Đường Lương Nhữ Hộc',
                'Đường Nguyễn Văn Linh', 'Đường Núi Thành', 'Đường Xô Viết Nghệ Tĩnh', 'Đường Trần Đại Nghĩa',
                'Đường Dũng Sĩ Thanh Khê', 'Đường Cao Thắng', 'Đường Nam Cao', 'Đường Hải Phòng',
            ],
        ];

        $listingTemplates = [
            [
                'prefix' => 'Phòng trọ cao cấp gác lửng',
                'type' => Listing::TYPE_ROOM,
                'min_price' => 2_500_000,
                'max_price' => 4_000_000,
                'min_area' => 18,
                'max_area' => 28,
                'desc' => 'Phòng mới xây có gác lửng đúc kiên cố, giờ giấc tự do, không chung chủ, có camera an ninh 24/7. Phù hợp cho 2-3 bạn sinh viên ở thoải mái.',
            ],
            [
                'prefix' => 'Phòng khép kín ban công thoáng mát',
                'type' => Listing::TYPE_ROOM,
                'min_price' => 2_800_000,
                'max_price' => 4_500_000,
                'min_area' => 20,
                'max_area' => 30,
                'desc' => 'Phòng đầy đủ tiện nghi, có ban công rộng rãi đón gió, toilet riêng khép kín, kệ bếp nấu ăn, wifi cáp quang tốc độ cao.',
            ],
            [
                'prefix' => 'Studio full nội thất gần trường',
                'type' => Listing::TYPE_APARTMENT,
                'min_price' => 4_500_000,
                'max_price' => 6_500_000,
                'min_area' => 30,
                'max_area' => 42,
                'desc' => 'Căn hộ dịch vụ studio trang bị sẵn máy lạnh, tủ lạnh, máy giặt, giường nệm cao cấp, bàn học. Ra vào khóa vân tay hiện đại.',
            ],
            [
                'prefix' => 'Phòng trọ sinh viên giá rẻ an ninh',
                'type' => Listing::TYPE_ROOM,
                'min_price' => 1_800_000,
                'max_price' => 2_600_000,
                'min_area' => 15,
                'max_area' => 22,
                'desc' => 'Phòng trọ bình dân khu dân trí cao, yên tĩnh học bài, nước máy sạch, điện nước giá nhà nước quy định, gần bến xe buýt và chợ dân sinh.',
            ],
            [
                'prefix' => 'Nhà nguyên căn chia phòng cho nhóm sinh viên',
                'type' => Listing::TYPE_HOUSE,
                'min_price' => 7_000_000,
                'max_price' => 12_000_000,
                'min_area' => 70,
                'max_area' => 110,
                'desc' => 'Nhà nguyên căn 3 phòng ngủ, phòng khách rộng, sân để xe máy thoải mái. Rất thích hợp cho nhóm bạn cùng lớp hoặc câu lạc bộ thuê chung tiết kiệm chi phí.',
            ],
        ];

        $globalIndex = 1;

        // Mỗi thành phố tạo 15-18 phòng thực tế gần các trường
        foreach ($cities as $city) {
            $cityWards = Ward::where('city_id', $city->id)->get();
            $citySchools = School::where('city_id', $city->id)->get();
            $streets = $streetNames[$city->name] ?? ['Đường Trung Tâm'];

            for ($i = 0; $i < 16; $i++) {
                // Phân bổ đều cho các chủ nhà (để mỗi chủ nhà sở hữu nhiều phòng)
                $landlord = $landlords[($globalIndex - 1) % $landlords->count()];
                $ward = $cityWards[$i % $cityWards->count()];
                $tpl = $listingTemplates[$i % count($listingTemplates)];
                $street = $streets[$i % count($streets)];

                $price = mt_rand((int) ($tpl['min_price'] / 100_000), (int) ($tpl['max_price'] / 100_000)) * 100_000;
                $area = mt_rand($tpl['min_area'], $tpl['max_area']);
                $houseNumber = mt_rand(1, 280);

                // Gần một trường cụ thể để demo tính năng lọc khoảng cách
                $school = $citySchools[$i % $citySchools->count()];
                // Tọa độ thực trong bán kính 200m - 800m quanh trường hoặc phường
                $lat = (float) $school->latitude + (mt_rand(-35, 35) / 10000);
                $lng = (float) $school->longitude + (mt_rand(-35, 35) / 10000);

                $title = sprintf('%s - Gần %s (%dm²)', $tpl['prefix'], $school->name, $area);
                $address = sprintf('Số %d %s, %s, %s', $houseNumber, $street, $ward->name, $city->name);

                $listing = Listing::create([
                    'user_id' => $landlord->id,
                    'ward_id' => $ward->id,
                    'title' => $title,
                    'description' => sprintf('%s Vị trí thuận tiện đi lại đến %s. Địa chỉ: %s.', $tpl['desc'], $school->name, $address),
                    'type' => $tpl['type'],
                    'price' => $price,
                    'area_m2' => $area,
                    'address' => $address,
                    'latitude' => $lat,
                    'longitude' => $lng,
                    'status' => Listing::STATUS_AVAILABLE,
                ]);

                // Gán tiện ích
                $shuffled = $amenityIds;
                shuffle($shuffled);
                $listing->amenities()->attach(array_slice($shuffled, 0, mt_rand(4, 7)));

                // Tạo ảnh minh họa
                if ($manager !== null) {
                    $this->createSampleImage($manager, $listing, $globalIndex, $city->name);
                }

                $globalIndex++;
            }
        }
    }

    private function createSampleImage(ImageManager $manager, Listing $listing, int $i, string $cityName): void
    {
        $backgrounds = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#EC4899'];
        $bg = $backgrounds[$i % count($backgrounds)];

        $label = sprintf('TROSV #%d - %s', $i, $cityName);
        $sub = sprintf('%.1f TRIEU / THANG - %dm2', $listing->price / 1_000_000, (int) $listing->area_m2);

        $image = $manager->createImage(640, 424)->fill($bg);

        $image->text($label, 320, 190, function ($font) {
            $font->size(5);
            $font->color('#FFFFFF');
            $font->align('center', 'center');
        });

        $image->text($sub, 320, 230, function ($font) {
            $font->size(4);
            $font->color('#F3F4F6');
            $font->align('center', 'center');
        });

        $path = "listings/seed-{$i}.jpg";
        Storage::disk('public')->put($path, (string) $image->encode(new JpegEncoder(85)));

        ListingImage::create(['listing_id' => $listing->id, 'path' => $path]);
    }
}
