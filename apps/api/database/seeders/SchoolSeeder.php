<?php

namespace Database\Seeders;

use App\Models\City;
use App\Models\School;
use App\Models\Ward;
use Illuminate\Database\Seeder;

class SchoolSeeder extends Seeder
{
    public function run(): void
    {
        // Danh sách 20 trường đại học/học viện lớn thực tế tại Hà Nội, TP.HCM và Đà Nẵng
        // Tọa độ thực tế (vĩ độ, kinh độ), địa chỉ chuẩn xác phục vụ tìm kiếm trọ xung quanh.
        $schoolsByCity = [
            'Hà Nội' => [
                ['name' => 'ĐH Bách Khoa Hà Nội (HUST)', 'latitude' => 21.0056, 'longitude' => 105.8433, 'ward' => 'Phường Bách Khoa'],
                ['name' => 'ĐHQG Hà Nội - ĐH Công nghệ (UET)', 'latitude' => 21.0371, 'longitude' => 105.7828, 'ward' => 'Phường Dịch Vọng Hậu'],
                ['name' => 'ĐH Kinh tế Quốc dân (NEU)', 'latitude' => 20.9961, 'longitude' => 105.8427, 'ward' => 'Phường Đồng Tâm'],
                ['name' => 'ĐH Ngoại thương (FTU)', 'latitude' => 21.0229, 'longitude' => 105.8038, 'ward' => 'Phường Láng Thượng'],
                ['name' => 'Học viện Ngân hàng (BA)', 'latitude' => 21.0089, 'longitude' => 105.8285, 'ward' => 'Phường Quang Trung'],
                ['name' => 'ĐH Xây dựng Hà Nội (HUCE)', 'latitude' => 20.9995, 'longitude' => 105.8420, 'ward' => 'Phường Đồng Tâm'],
                ['name' => 'ĐH Giao thông Vận tải (UTC)', 'latitude' => 21.0287, 'longitude' => 105.8016, 'ward' => 'Phường Láng Thượng'],
                ['name' => 'ĐH Thương mại (TMU)', 'latitude' => 21.0366, 'longitude' => 105.7744, 'ward' => 'Phường Mai Dịch'],
                ['name' => 'ĐH Sư phạm Hà Nội (HNUE)', 'latitude' => 21.0374, 'longitude' => 105.7831, 'ward' => 'Phường Dịch Vọng Hậu'],
                ['name' => 'ĐH Y Hà Nội (HMU)', 'latitude' => 21.0028, 'longitude' => 105.8310, 'ward' => 'Phường Trung Liệt'],
                ['name' => 'ĐH Dược Hà Nội (HUP)', 'latitude' => 21.0205, 'longitude' => 105.8576, 'ward' => 'Phường Phan Chu Trinh'],
                ['name' => 'Học viện Tài chính (AOF)', 'latitude' => 21.0772, 'longitude' => 105.7766, 'ward' => 'Phường Đức Thắng'],
                ['name' => 'Học viện Báo chí & Tuyên truyền (AJC)', 'latitude' => 21.0362, 'longitude' => 105.7892, 'ward' => 'Phường Dịch Vọng Hậu'],
                ['name' => 'Học viện Công nghệ Bưu chính Viễn thông (PTIT)', 'latitude' => 20.9806, 'longitude' => 105.7877, 'ward' => 'Phường Mộ Lao'],
                ['name' => 'ĐH Luật Hà Nội (HLU)', 'latitude' => 21.0185, 'longitude' => 105.8080, 'ward' => 'Phường Láng Thượng'],
                ['name' => 'ĐH Công nghiệp Hà Nội (HaUI)', 'latitude' => 21.0537, 'longitude' => 105.7351, 'ward' => 'Phường Minh Khai'],
                ['name' => 'ĐH Khoa học Tự nhiên - ĐHQGHN (HUS)', 'latitude' => 20.9944, 'longitude' => 105.8083, 'ward' => 'Phường Thanh Xuân Trung'],
                ['name' => 'ĐH KHXH&NV - ĐHQGHN (USSH HN)', 'latitude' => 20.9950, 'longitude' => 105.8075, 'ward' => 'Phường Thanh Xuân Trung'],
                ['name' => 'ĐH Kiến trúc Hà Nội (HAU)', 'latitude' => 20.9825, 'longitude' => 105.7885, 'ward' => 'Phường Mộ Lao'],
                ['name' => 'ĐH Thủy lợi (TLU)', 'latitude' => 21.0076, 'longitude' => 105.8242, 'ward' => 'Phường Trung Liệt'],
            ],
            'TP.HCM' => [
                ['name' => 'ĐH Bách Khoa - ĐHQG TP.HCM (HCMUT)', 'latitude' => 10.7721, 'longitude' => 106.6577, 'ward' => 'Phường Diên Hồng'],
                ['name' => 'ĐH Khoa học Tự nhiên - ĐHQG TP.HCM (HCMUS)', 'latitude' => 10.7628, 'longitude' => 106.6824, 'ward' => 'Phường Chợ Quán'],
                ['name' => 'ĐH KHXH&NV - ĐHQG TP.HCM (USSH HCM)', 'latitude' => 10.7877, 'longitude' => 106.7018, 'ward' => 'Phường Bến Nghé'],
                ['name' => 'ĐH Quốc tế - ĐHQG TP.HCM (HCMIU)', 'latitude' => 10.8779, 'longitude' => 106.8019, 'ward' => 'Phường Linh Trung'],
                ['name' => 'ĐH Công nghệ Thông tin - ĐHQG TP.HCM (UIT)', 'latitude' => 10.8700, 'longitude' => 106.8030, 'ward' => 'Phường Linh Trung'],
                ['name' => 'ĐH Kinh tế - Luật - ĐHQG TP.HCM (UEL)', 'latitude' => 10.8697, 'longitude' => 106.7781, 'ward' => 'Phường Linh Xuân'],
                ['name' => 'ĐH Kinh tế TP.HCM (UEH)', 'latitude' => 10.7830, 'longitude' => 106.6953, 'ward' => 'Phường Võ Thị Sáu'],
                ['name' => 'ĐH Tôn Đức Thắng (TDTU)', 'latitude' => 10.7325, 'longitude' => 106.6996, 'ward' => 'Phường Tân Phong'],
                ['name' => 'ĐH Sư phạm Kỹ thuật TP.HCM (HCMUTE)', 'latitude' => 10.8508, 'longitude' => 106.7721, 'ward' => 'Phường Linh Chiểu'],
                ['name' => 'ĐH Công nghệ TP.HCM (HUTECH)', 'latitude' => 10.8018, 'longitude' => 106.7148, 'ward' => 'Phường Thạnh Mỹ Tây'],
                ['name' => 'ĐH Sư phạm TP.HCM (HCMUE)', 'latitude' => 10.7616, 'longitude' => 106.6824, 'ward' => 'Phường Chợ Quán'],
                ['name' => 'ĐH Y Dược TP.HCM (UMP)', 'latitude' => 10.7548, 'longitude' => 106.6636, 'ward' => 'Phường Chợ Lớn'],
                ['name' => 'ĐH Luật TP.HCM (HCMULAW)', 'latitude' => 10.7667, 'longitude' => 106.7038, 'ward' => 'Phường Xóm Chiếu'],
                ['name' => 'ĐH Ngân hàng TP.HCM (HUB)', 'latitude' => 10.7706, 'longitude' => 106.7032, 'ward' => 'Phường Bến Thành'],
                ['name' => 'ĐH Nông Lâm TP.HCM (NLU)', 'latitude' => 10.8712, 'longitude' => 106.7913, 'ward' => 'Phường Linh Trung'],
                ['name' => 'ĐH Văn Lang (VLU)', 'latitude' => 10.8286, 'longitude' => 106.6987, 'ward' => 'Phường Bình Lợi Trung'],
                ['name' => 'ĐH RMIT Việt Nam (RMIT)', 'latitude' => 10.7293, 'longitude' => 106.6935, 'ward' => 'Phường Tân Phong'],
                ['name' => 'ĐH Sài Gòn (SGU)', 'latitude' => 10.7599, 'longitude' => 106.6820, 'ward' => 'Phường Chợ Quán'],
                ['name' => 'ĐH Công nghiệp TP.HCM (IUH)', 'latitude' => 10.8219, 'longitude' => 106.6867, 'ward' => 'Phường Hạnh Thông'],
                ['name' => 'ĐH Mở TP.HCM (HCMCOU)', 'latitude' => 10.7766, 'longitude' => 106.6908, 'ward' => 'Phường Võ Thị Sáu'],
            ],
            'Đà Nẵng' => [
                ['name' => 'ĐH Bách Khoa - ĐH Đà Nẵng (DUT)', 'latitude' => 16.0749, 'longitude' => 108.1532, 'ward' => 'Phường Hòa Khánh Bắc'],
                ['name' => 'ĐH Kinh tế - ĐH Đà Nẵng (DUE)', 'latitude' => 16.0494, 'longitude' => 108.2405, 'ward' => 'Phường Mỹ An'],
                ['name' => 'ĐH Sư phạm - ĐH Đà Nẵng (UED)', 'latitude' => 16.0602, 'longitude' => 108.1593, 'ward' => 'Phường Hòa Khánh Nam'],
                ['name' => 'ĐH Ngoại ngữ - ĐH Đà Nẵng (UFL)', 'latitude' => 16.0336, 'longitude' => 108.2106, 'ward' => 'Phường Khuê Trung'],
                ['name' => 'ĐH Sư phạm Kỹ thuật - ĐH Đà Nẵng (UTE DN)', 'latitude' => 16.0792, 'longitude' => 108.2144, 'ward' => 'Phường Thanh Bình'],
                ['name' => 'ĐH CNTT & Truyền thông Việt - Hàn (VKU)', 'latitude' => 15.9753, 'longitude' => 108.2526, 'ward' => 'Phường Hòa Quý'],
                ['name' => 'ĐH Duy Tân - CS Nguyễn Văn Linh (DTU)', 'latitude' => 16.0610, 'longitude' => 108.2101, 'ward' => 'Phường Thạc Gián'],
                ['name' => 'ĐH Duy Tân - CS Hòa Khánh (DTU HK)', 'latitude' => 16.0735, 'longitude' => 108.1482, 'ward' => 'Phường Hòa Khánh Nam'],
                ['name' => 'ĐH Đông Á (UDA)', 'latitude' => 16.0325, 'longitude' => 108.2201, 'ward' => 'Phường Hòa Cường Nam'],
                ['name' => 'ĐH FPT Đà Nẵng (FPT DN)', 'latitude' => 15.9868, 'longitude' => 108.2612, 'ward' => 'Phường Hòa Hải'],
                ['name' => 'ĐH Kỹ thuật Y - Dược Đà Nẵng', 'latitude' => 16.0691, 'longitude' => 108.2185, 'ward' => 'Phường Hải Châu'],
                ['name' => 'ĐH Kiến trúc Đà Nẵng (DAU)', 'latitude' => 16.0354, 'longitude' => 108.2218, 'ward' => 'Phường Hòa Cường Nam'],
                ['name' => 'Khoa Y - Dược - ĐH Đà Nẵng (SMP DN)', 'latitude' => 15.9892, 'longitude' => 108.2498, 'ward' => 'Phường Hòa Quý'],
                ['name' => 'Viện Nghiên cứu & Đào tạo Việt - Anh (VNUK)', 'latitude' => 16.0731, 'longitude' => 108.2205, 'ward' => 'Phường Hải Châu'],
                ['name' => 'Học viện Chính trị Khu vực III', 'latitude' => 16.0632, 'longitude' => 108.2372, 'ward' => 'Phường An Hải Đông'],
                ['name' => 'ĐH Greenwich Việt Nam - CS Đà Nẵng', 'latitude' => 16.0798, 'longitude' => 108.2366, 'ward' => 'Phường An Hải Bắc'],
                ['name' => 'ĐH Thể dục Thể thao Đà Nẵng (DSU)', 'latitude' => 16.0658, 'longitude' => 108.1812, 'ward' => 'Phường Thanh Khê Tây'],
                ['name' => 'Cao đẳng CNTT Đà Nẵng (CIT)', 'latitude' => 15.9760, 'longitude' => 108.2510, 'ward' => 'Phường Hòa Quý'],
                ['name' => 'Cao đẳng Du lịch Đà Nẵng (DVTC)', 'latitude' => 15.9856, 'longitude' => 108.2571, 'ward' => 'Phường Hòa Hải'],
                ['name' => 'Cao đẳng Thương mại Đà Nẵng (CDTM)', 'latitude' => 16.0665, 'longitude' => 108.1805, 'ward' => 'Phường Thanh Khê Tây'],
            ],
        ];

        foreach ($schoolsByCity as $cityName => $schools) {
            $city = City::where('name', $cityName)->first();
            if (! $city) {
                continue;
            }

            foreach ($schools as $school) {
                $ward = Ward::where('city_id', $city->id)
                    ->where('name', $school['ward'])
                    ->first()
                    ?? Ward::where('city_id', $city->id)->first();

                School::create([
                    'city_id' => $city->id,
                    'ward_id' => $ward?->id,
                    'name' => $school['name'],
                    'latitude' => $school['latitude'],
                    'longitude' => $school['longitude'],
                ]);
            }
        }
    }
}
