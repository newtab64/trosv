<?php

namespace Database\Seeders;

use App\Modules\Auth\Models\User;
use App\Modules\Listing\Models\Listing;
use App\Modules\Listing\Models\ListingImage;
use App\Modules\Reference\Models\Amenity;
use App\Modules\Reference\Models\School;
use App\Shared\Support\Geo;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Storage;

/**
 * 22 phòng thật: ảnh ở images/rooms/NN (thư mục 01-07 Hà Nội, 08-14 Đà Nẵng, 15-22 TP.HCM).
 * Mỗi phòng nằm gần một trường có sẵn (cùng phường với trường); mô tả viết theo đúng ảnh,
 * còn địa chỉ và khoảng cách tới trường được ghép vào mô tả từ dữ liệu thật.
 */
class ListingSeeder extends Seeder
{
    /**
     * school: tên trường trong SchoolSeeder; north/east: lệch so với trường (mét).
     *
     * @var list<array{school: string, street: string, north: int, east: int, type: string, title: string,
     *     price: int, area: int, amenities: list<string>, desc: string}>
     */
    private const ROOMS = [
        // ---------------------------------------------------------------- Hà Nội (01-07)
        [
            'school' => 'ĐHQG Hà Nội - ĐH Công nghệ (UET)', 'street' => 'Số 18 ngõ 175 Xuân Thủy', 'north' => -350, 'east' => 420,
            'type' => Listing::TYPE_APARTMENT, 'title' => 'Studio full nội thất, cửa sổ lớn', 'price' => 5_800_000, 'area' => 30,
            'amenities' => ['Wi-Fi', 'Máy lạnh', 'Máy nước nóng', 'Máy giặt', 'Tủ lạnh', 'Bếp', 'WC riêng'],
            'desc' => 'Studio mới sơn trắng, hai cửa sổ lớn đón nắng. Có giường đôi, sofa, bàn trang điểm, tủ quần áo âm tường, quạt trần và máy lạnh. Góc bếp liền tủ lạnh, máy giặt cửa trước. Phòng tắm kính, bồn cầu và lavabo hiện đại.',
        ],
        [
            'school' => 'ĐH Bách Khoa Hà Nội (HUST)', 'street' => 'Số 7 ngõ 40 Tạ Quang Bửu', 'north' => 300, 'east' => 380,
            'type' => Listing::TYPE_ROOM, 'title' => 'Phòng gác lửng có ban công, sơn mới', 'price' => 3_200_000, 'area' => 22,
            'amenities' => ['Wi-Fi', 'Máy nước nóng', 'Bếp', 'WC riêng', 'Giờ giấc tự do'],
            'desc' => 'Phòng có gác lửng rộng, tường sơn xanh nhạt, sàn gạch men sáng. Cửa ra ban công nhỏ thoáng gió, góc bếp có tủ dưới và kệ chén. Phòng trống, tiện tự sắp xếp đồ theo ý mình.',
        ],
        [
            'school' => 'ĐH Kinh tế Quốc dân (NEU)', 'street' => 'Số 23 ngõ 58 Trần Đại Nghĩa', 'north' => 250, 'east' => -300,
            'type' => Listing::TYPE_ROOM, 'title' => 'Phòng gác lửng sàn gỗ, có máy lạnh', 'price' => 3_500_000, 'area' => 25,
            'amenities' => ['Wi-Fi', 'Máy lạnh', 'Máy nước nóng', 'Bếp', 'WC riêng', 'Chỗ để xe'],
            'desc' => 'Phòng có gác lửng lát sàn gỗ, cầu thang sắt chắc chắn, dưới gác có tủ quần áo gỗ. Máy lạnh, cửa sổ có song sắt, bếp mặt đá có bồn rửa và kệ treo đồ. Nhà vệ sinh riêng.',
        ],
        [
            'school' => 'ĐH Ngoại thương (FTU)', 'street' => 'Số 12 ngõ 1194 Đường Láng', 'north' => -400, 'east' => 250,
            'type' => Listing::TYPE_ROOM, 'title' => 'Phòng gác gỗ nhỏ gọn, giá sinh viên', 'price' => 2_300_000, 'area' => 16,
            'amenities' => ['Wi-Fi', 'Máy nước nóng', 'Bếp', 'WC riêng'],
            'desc' => 'Phòng dài, ốp gạch trắng sạch sẽ, có gác lửng ván gỗ để ngủ hoặc để đồ. Kệ bếp có bồn rửa inox, tủ treo phía trên. Nhà vệ sinh riêng có tay vịn, gương và vòi sen.',
        ],
        [
            'school' => 'ĐH Thương mại (TMU)', 'street' => 'Số 9 ngõ 130 Hồ Tùng Mậu', 'north' => 380, 'east' => 300,
            'type' => Listing::TYPE_APARTMENT, 'title' => 'Căn hộ dịch vụ rộng, sofa da, bếp đầy đủ', 'price' => 7_500_000, 'area' => 40,
            'amenities' => ['Wi-Fi', 'Máy lạnh', 'Máy nước nóng', 'Máy giặt', 'Tủ lạnh', 'Bếp', 'WC riêng'],
            'desc' => 'Căn hộ sàn gỗ, cửa kính lớn nhìn ra cây xanh. Phòng khách có sofa da, thảm và TV; bàn ăn hai ghế cạnh tủ lạnh và máy giặt. Bếp tủ trắng, đèn chùm trang trí. Phòng tắm kính có sen cây.',
        ],
        [
            'school' => 'Học viện Công nghệ Bưu chính Viễn thông (PTIT)', 'street' => 'Số 31 ngõ 122 Trần Phú', 'north' => 350, 'east' => -250,
            'type' => Listing::TYPE_APARTMENT, 'title' => 'Studio sàn gỗ, có tủ lạnh và bếp riêng', 'price' => 4_500_000, 'area' => 28,
            'amenities' => ['Wi-Fi', 'Máy lạnh', 'Máy nước nóng', 'Tủ lạnh', 'Bếp', 'WC riêng'],
            'desc' => 'Studio trần thạch cao có đèn hắt, sàn giả gỗ. Có giường đơn, tủ lạnh, tủ quần áo lớn, giá treo đồ và máy lạnh. Bếp tủ trắng sát tường, cửa gỗ chắc chắn, hộc tường để đồ.',
        ],
        [
            'school' => 'ĐH Khoa học Tự nhiên - ĐHQGHN (HUS)', 'street' => 'Số 15 ngõ 214 Nguyễn Trãi', 'north' => -300, 'east' => -350,
            'type' => Listing::TYPE_ROOM, 'title' => 'Phòng gác lửng có tủ lạnh, bãi xe rộng', 'price' => 2_800_000, 'area' => 20,
            'amenities' => ['Wi-Fi', 'Máy lạnh', 'Tủ lạnh', 'Bếp', 'WC riêng', 'Chỗ để xe'],
            'desc' => 'Phòng có gác lửng lan can trắng, thang leo gọn. Dưới gác có tủ quần áo gỗ và tủ lạnh mini, máy lạnh lắp sẵn. Kệ bếp gần cửa sổ. Tầng trệt có bãi để xe máy rộng, lát gạch sạch.',
        ],
        // ---------------------------------------------------------------- Đà Nẵng (08-14)
        [
            'school' => 'ĐH Bách Khoa - ĐH Đà Nẵng (DUT)', 'street' => 'Số 14 kiệt 45 Nguyễn Lương Bằng', 'north' => 300, 'east' => -250,
            'type' => Listing::TYPE_ROOM, 'title' => 'Phòng gác lửng mới xây, hành lang thoáng', 'price' => 2_200_000, 'area' => 18,
            'amenities' => ['Wi-Fi', 'Máy nước nóng', 'Bếp', 'WC riêng', 'Giờ giấc tự do'],
            'desc' => 'Phòng mới có gác lửng cầu thang sắt, sàn gạch men, quạt treo tường. Kệ bếp mặt đá có bồn rửa và giá treo chén. Nhà vệ sinh riêng lát gạch xám. Hành lang có lan can, cửa sắt sơn xanh.',
        ],
        [
            'school' => 'ĐH Sư phạm - ĐH Đà Nẵng (UED)', 'street' => 'Số 8 kiệt 12 Tôn Đức Thắng', 'north' => -350, 'east' => 300,
            'type' => Listing::TYPE_ROOM, 'title' => 'Phòng trọ giá rẻ, sạch sẽ, gần trường', 'price' => 1_600_000, 'area' => 16,
            'amenities' => ['Wi-Fi', 'Bếp', 'WC riêng', 'Chỗ để xe'],
            'desc' => 'Phòng ốp gạch trắng cao, sàn gạch men bóng, cửa nhôm kính. Có bàn bếp inox kèm bồn rửa và nhà vệ sinh riêng. Dãy trọ có hành lang dài, cửa sổ thoáng, phù hợp một bạn ở.',
        ],
        [
            'school' => 'ĐH Duy Tân - CS Nguyễn Văn Linh (DTU)', 'street' => 'Số 27 kiệt 80 Nguyễn Văn Linh', 'north' => 320, 'east' => 280,
            'type' => Listing::TYPE_ROOM, 'title' => 'Phòng có giường, tủ, máy lạnh, vào ở ngay', 'price' => 2_600_000, 'area' => 22,
            'amenities' => ['Wi-Fi', 'Máy lạnh', 'Máy nước nóng', 'Bếp', 'WC riêng', 'Chỗ để xe'],
            'desc' => 'Phòng có sẵn giường gỗ, nệm, tủ quần áo trắng, máy lạnh và quạt treo tường. Kệ bếp có bồn rửa và tủ dưới, cửa sổ có rèm. Nhà vệ sinh riêng, sàn gạch men vàng sáng.',
        ],
        [
            'school' => 'ĐH Ngoại ngữ - ĐH Đà Nẵng (UFL)', 'street' => 'Số 11 kiệt 30 Núi Thành', 'north' => -300, 'east' => -280,
            'type' => Listing::TYPE_ROOM, 'title' => 'Phòng rộng có giường, máy lạnh, WC riêng', 'price' => 3_000_000, 'area' => 25,
            'amenities' => ['Wi-Fi', 'Máy lạnh', 'Máy nước nóng', 'Bếp', 'WC riêng', 'Giờ giấc tự do'],
            'desc' => 'Phòng trần thạch cao, sàn gạch vân đá. Có giường gỗ, máy lạnh, tủ bếp gỗ sáng kèm bồn rửa. Nhà vệ sinh riêng có gương, kệ kính và vòi sen. Cửa sổ có song chắn an toàn.',
        ],
        [
            'school' => 'Viện Nghiên cứu & Đào tạo Việt - Anh (VNUK)', 'street' => 'Số 6 kiệt 110 Hải Phòng', 'north' => -280, 'east' => -300,
            'type' => Listing::TYPE_ROOM, 'title' => 'Phòng gác lửng nhỏ xinh, giá mềm', 'price' => 1_900_000, 'area' => 15,
            'amenities' => ['Wi-Fi', 'Bếp', 'WC riêng', 'Chỗ để xe'],
            'desc' => 'Phòng sơn xanh mint, có gác lửng lan can trắng và thang leo. Góc bếp nhỏ có bồn rửa inox, kệ chén treo tường. Nhà xe chung ở tầng trệt.',
        ],
        [
            'school' => 'ĐH Sư phạm Kỹ thuật - ĐH Đà Nẵng (UTE DN)', 'street' => 'Số 19 kiệt 48 Cao Thắng', 'north' => 260, 'east' => -330,
            'type' => Listing::TYPE_ROOM, 'title' => 'Phòng gác lửng cửa kính, nhiều cửa sổ', 'price' => 2_400_000, 'area' => 20,
            'amenities' => ['Wi-Fi', 'Máy lạnh', 'Máy nước nóng', 'WC riêng', 'Giờ giấc tự do'],
            'desc' => 'Phòng có gác lửng lan can sắt đen, tường nhấn xanh dương, sàn gạch trắng. Cửa nhôm kính, hai cửa sổ lấy sáng tốt, máy lạnh lắp trên gác. Nhà vệ sinh riêng.',
        ],
        [
            'school' => 'ĐH Kinh tế - ĐH Đà Nẵng (DUE)', 'street' => 'Số 5 kiệt 15 Lê Văn Hiến', 'north' => -330, 'east' => -260,
            'type' => Listing::TYPE_APARTMENT, 'title' => 'Căn hộ có phòng ngủ riêng, đủ nội thất', 'price' => 5_000_000, 'area' => 35,
            'amenities' => ['Wi-Fi', 'Máy lạnh', 'Máy nước nóng', 'Máy giặt', 'Tủ lạnh', 'Bếp', 'WC riêng'],
            'desc' => 'Căn hộ có phòng ngủ riêng với giường đôi và tủ âm tường gỗ. Phòng chính có bếp, tủ lạnh, máy giặt, bàn ăn và máy lạnh. Phòng tắm có buồng tắm kính tròn, sàn gạch bóng.',
        ],
        // ---------------------------------------------------------------- TP.HCM (15-22)
        [
            'school' => 'ĐH Khoa học Tự nhiên - ĐHQG TP.HCM (HCMUS)', 'street' => 'Số 42 hẻm 180 Trần Bình Trọng', 'north' => 280, 'east' => 300,
            'type' => Listing::TYPE_ROOM, 'title' => 'Phòng có tủ lạnh, tủ quần áo, máy lạnh', 'price' => 3_200_000, 'area' => 20,
            'amenities' => ['Wi-Fi', 'Máy lạnh', 'Máy nước nóng', 'Tủ lạnh', 'Bếp', 'WC riêng'],
            'desc' => 'Phòng có sẵn nệm, tủ quần áo, tủ bếp nhỏ kèm bồn rửa, tủ lạnh mini và máy lạnh. Sàn gạch xanh nhạt sạch sẽ. Nhà vệ sinh riêng ốp gạch xanh, có lavabo và gương.',
        ],
        [
            'school' => 'ĐH Công nghệ TP.HCM (HUTECH)', 'street' => 'Số 16 hẻm 475 Điện Biên Phủ', 'north' => -300, 'east' => -300,
            'type' => Listing::TYPE_APARTMENT, 'title' => 'Căn hộ mới, nội thất gỗ, ban công', 'price' => 5_500_000, 'area' => 32,
            'amenities' => ['Wi-Fi', 'Máy lạnh', 'Máy nước nóng', 'Tủ lạnh', 'Bếp', 'WC riêng', 'Bảo vệ'],
            'desc' => 'Căn hộ mới hoàn thiện, nội thất gỗ đồng bộ: giường, tủ đầu giường, tủ quần áo lớn và tủ bếp mặt đá đen. Cửa sổ có lam chắn nắng, ban công nhỏ. Hành lang lát gạch bóng, sạch sẽ.',
        ],
        [
            'school' => 'ĐH Tôn Đức Thắng (TDTU)', 'street' => 'Số 25 hẻm 15 Nguyễn Hữu Thọ', 'north' => 320, 'east' => 250,
            'type' => Listing::TYPE_ROOM, 'title' => 'Phòng gác lửng có ban công, WC riêng', 'price' => 4_200_000, 'area' => 28,
            'amenities' => ['Wi-Fi', 'Máy lạnh', 'Máy nước nóng', 'Bếp', 'WC riêng', 'Chỗ để xe'],
            'desc' => 'Phòng rộng lát gạch vân gỗ, có gác lửng lát sàn gỗ và cầu thang kiêm tủ để đồ. Ban công lan can sắt hoa nhìn ra phố. Máy lạnh, kệ bếp, nhà vệ sinh riêng ốp gạch.',
        ],
        [
            'school' => 'ĐH Nông Lâm TP.HCM (NLU)', 'street' => 'Số 7 hẻm 12 Đường số 6', 'north' => -320, 'east' => -280,
            'type' => Listing::TYPE_ROOM, 'title' => 'Phòng trọ sạch, giá rẻ khu Làng Đại học', 'price' => 2_200_000, 'area' => 14,
            'amenities' => ['Wi-Fi', 'Bếp', 'WC riêng', 'Chỗ để xe'],
            'desc' => 'Phòng ốp gạch trắng, sàn gạch men, trần cao thoáng. Bàn bếp mặt đá có bồn rửa inox. Nhà vệ sinh riêng có bồn cầu. Phù hợp một bạn sinh viên cần chỗ ở gọn, giá mềm.',
        ],
        [
            'school' => 'ĐH Sư phạm Kỹ thuật TP.HCM (HCMUTE)', 'street' => 'Số 33 hẻm 40 Võ Văn Ngân', 'north' => 280, 'east' => 320,
            'type' => Listing::TYPE_ROOM, 'title' => 'Phòng gác lửng sàn gỗ, tủ bếp đầy đủ', 'price' => 3_800_000, 'area' => 25,
            'amenities' => ['Wi-Fi', 'Máy lạnh', 'Máy nước nóng', 'Bếp', 'WC riêng', 'Giờ giấc tự do'],
            'desc' => 'Phòng có gác lửng lát sàn gỗ, lan can và thang trắng. Tủ bếp hai tầng có bồn rửa, tường bếp ốp gạch lục giác. Ốp gạch vân đá nửa tường, cửa sổ lấy sáng.',
        ],
        [
            'school' => 'ĐH Công nghiệp TP.HCM (IUH)', 'street' => 'Số 21 hẻm 66 Nguyễn Văn Bảo', 'north' => -280, 'east' => 300,
            'type' => Listing::TYPE_ROOM, 'title' => 'Phòng có ban công, giường và tủ gỗ', 'price' => 4_000_000, 'area' => 24,
            'amenities' => ['Wi-Fi', 'Máy lạnh', 'Máy nước nóng', 'Bếp', 'WC riêng', 'Chỗ để xe'],
            'desc' => 'Phòng sáng, có cửa ra ban công nhỏ và cửa sổ lớn. Có sẵn giường gỗ, tủ quần áo gỗ, kệ bếp mặt đá kèm bồn rửa. Nhà vệ sinh riêng có lavabo.',
        ],
        [
            'school' => 'ĐH Y Dược TP.HCM (UMP)', 'street' => 'Số 13 hẻm 200 Hồng Bàng', 'north' => 300, 'east' => -280,
            'type' => Listing::TYPE_ROOM, 'title' => 'Phòng gác lửng rộng, WC riêng', 'price' => 2_900_000, 'area' => 18,
            'amenities' => ['Wi-Fi', 'Máy nước nóng', 'Bếp', 'WC riêng', 'Giờ giấc tự do'],
            'desc' => 'Phòng có gác lửng lan can sắt, sàn gạch hoa văn, tường ốp gạch trắng viền xanh. Có kệ bếp xây, cửa sổ song sắt. Nhà vệ sinh riêng có bồn cầu và vòi sen.',
        ],
        [
            'school' => 'ĐH Kinh tế TP.HCM (UEH)', 'street' => 'Số 45 hẻm 59 Nguyễn Đình Chiểu', 'north' => -260, 'east' => -320,
            'type' => Listing::TYPE_ROOM, 'title' => 'Phòng gác lửng cửa vòm, có ban công', 'price' => 3_600_000, 'area' => 22,
            'amenities' => ['Wi-Fi', 'Máy lạnh', 'Máy nước nóng', 'Bếp', 'WC riêng', 'Chỗ để xe'],
            'desc' => 'Phòng có gác lửng lan can đen, cửa vòm sắt nghệ thuật dẫn ra ban công. Kệ bếp mặt đá đen có bồn rửa. Nhà vệ sinh riêng ốp gạch xám.',
        ],
    ];

    public function run(): void
    {
        $landlords = User::where('role', User::ROLE_LANDLORD)->orderBy('id')->get();
        $amenityIds = Amenity::pluck('id', 'name');

        // Xóa ảnh seed cũ để không tích tụ file rác
        Storage::disk('public')->delete(Storage::disk('public')->files('listings'));

        foreach (self::ROOMS as $i => $room) {
            $school = School::with(['ward', 'city'])->where('name', $room['school'])->firstOrFail();
            $landlord = $landlords[$i % $landlords->count()];
            $ward = $school->ward;
            $city = $school->city;
            if (! $landlord instanceof User || $ward === null || $city === null) {
                continue;
            }

            [$lat, $lng] = self::offset((float) $school->latitude, (float) $school->longitude, $room['north'], $room['east']);
            $meters = (int) (round(Geo::haversineKm($lat, $lng, (float) $school->latitude, (float) $school->longitude, 3) * 1000 / 50) * 50);
            $address = sprintf('%s, %s, %s', $room['street'], $ward->name, $city->name);

            $listing = Listing::create([
                'user_id' => $landlord->id,
                'ward_id' => $ward->id,
                'title' => sprintf('%s - Gần %s', $room['title'], $school->name),
                'description' => sprintf(
                    '%s Địa chỉ: %s, cách %s khoảng %d m (đi bộ chừng %d phút).',
                    $room['desc'], $address, $school->name, $meters, max(1, (int) round($meters / 80)),
                ),
                'type' => $room['type'],
                'price' => $room['price'],
                'area_m2' => $room['area'],
                'address' => $address,
                'latitude' => $lat,
                'longitude' => $lng,
                'status' => Listing::STATUS_AVAILABLE,
            ]);

            $listing->amenities()->attach(array_values(array_filter(
                array_map(fn (string $name) => $amenityIds[$name] ?? null, $room['amenities']),
            )));

            $this->attachPhotos($listing, $i + 1);
        }
    }

    /**
     * Move a point by metres north/east.
     *
     * @return array{float, float}
     */
    private static function offset(float $lat, float $lng, int $north, int $east): array
    {
        return [
            round($lat + $north / 111_320, 7),
            round($lng + $east / (111_320 * cos(deg2rad($lat))), 7),
        ];
    }

    private function attachPhotos(Listing $listing, int $folder): void
    {
        $photos = glob(sprintf('%s/images/rooms/%02d/*.webp', __DIR__, $folder)) ?: [];
        sort($photos, SORT_NATURAL);

        foreach ($photos as $k => $photo) {
            $path = sprintf('listings/room-%02d-%d.webp', $folder, $k + 1);
            Storage::disk('public')->put($path, (string) file_get_contents($photo));
            ListingImage::create(['listing_id' => $listing->id, 'path' => $path]);
        }
    }
}
