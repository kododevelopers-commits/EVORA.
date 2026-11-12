// ============================================================================
// locations.js — Pakistan delivery location catalogue (city -> area/sector).
// ----------------------------------------------------------------------------
// Powers the checkout location picker. Cities are grouped by province/region;
// each city lists its well-known towns, areas, sectors and phases. Streets and
// house numbers are entered as free text in the picker (they are infinite), and
// any area not listed here can still be typed in, so every address is reachable.
//
// Loaded as a plain <script> in the browser (window.EVORA_LOCATIONS) and via
// require() in tests. This is reference data only — no secrets, no network.
// ============================================================================

var EVORA_LOCATIONS = {
  country: 'Pakistan',
  regions: [
    { id: 'islamabad', name: 'Islamabad Capital' },
    { id: 'punjab', name: 'Punjab' },
    { id: 'sindh', name: 'Sindh' },
    { id: 'kpk', name: 'Khyber Pakhtunkhwa' },
    { id: 'balochistan', name: 'Balochistan' },
    { id: 'gb', name: 'Gilgit-Baltistan' },
    { id: 'ajk', name: 'Azad Jammu & Kashmir' }
  ],
  cities: [
    // ---------------- Islamabad Capital ----------------
    { name: 'Islamabad', region: 'islamabad', areas: [
      'Blue Area', 'F-5', 'F-6', 'F-7', 'F-8', 'F-9', 'F-10', 'F-11', 'F-12', 'F-13', 'F-14', 'F-15', 'F-16', 'F-17',
      'G-5', 'G-6', 'G-7', 'G-8', 'G-9', 'G-10', 'G-11', 'G-12', 'G-13', 'G-14', 'G-15', 'G-16',
      'I-8', 'I-9', 'I-10', 'I-11', 'I-12', 'I-13', 'I-14', 'I-15', 'I-16',
      'E-7', 'E-8', 'E-9', 'E-10', 'E-11', 'E-12', 'E-13', 'E-14', 'E-15', 'E-16',
      'H-8', 'H-9', 'H-10', 'H-11', 'H-12', 'H-13',
      'Bahria Enclave', 'Bahria Town Islamabad', 'DHA Phase 1', 'DHA Phase 2', 'DHA Phase 3', 'DHA Phase 4', 'DHA Phase 5',
      'Gulberg Greens', 'Gulberg Residencia', 'Soan Garden', 'PWD Housing Society', 'Media Town', 'Askari 14',
      'Bani Gala', 'Chak Shahzad', 'Rawal Town', 'Malpur', 'Nilore', 'Bhara Kahu', 'Shah Allah Ditta', 'Golra Sharif',
      'Saidpur Village', 'Nurpur Village', 'Margalla Hills', 'Faisal Mosque Area', 'Zero Point', 'Saddar Rawalpindi Cantt'
    ]},
    { name: 'Rawalpindi', region: 'punjab', areas: [
      'Saddar', 'Cantt', 'Bahria Town Phase 1', 'Bahria Town Phase 2', 'Bahria Town Phase 3', 'Bahria Town Phase 4',
      'Bahria Town Phase 5', 'Bahria Town Phase 6', 'Bahria Town Phase 7', 'Bahria Town Phase 8',
      'DHA Phase 1', 'DHA Phase 2', 'DHA Phase 3', 'DHA Phase 4', 'DHA Phase 5',
      'Satellite Town', 'Chandni Chowk', 'Commercial Market', 'Murree Road', 'Adiala Road', 'Chaklala Scheme 1',
      'Chaklala Scheme 2', 'Chaklala Scheme 3', 'Tench Bhata', 'Gulraiz', 'PWD', 'Soan Garden', 'Gulzar-e-Quaid',
      'Askari 1', 'Askari 2', 'Askari 3', 'Askari 4', 'Askari 5', 'Askari 6', 'Askari 7', 'Askari 8', 'Askari 9', 'Askari 10', 'Askari 11',
      'Westridge', 'Misrial', 'Lalkurti', 'Dhoke Kala Khan', 'Dhoke Hassu', 'Peshawar Road', 'Fazaia Colony',
      'Chaklala Cantt', 'Rawal Town', 'Morgah', 'Ayub Park Area', '6th Road', 'Committee Chowk', 'Raja Bazaar', 'Liaquat Bagh'
    ]},

    // ---------------- Punjab ----------------
    { name: 'Lahore', region: 'punjab', areas: [
      'DHA Phase 1', 'DHA Phase 2', 'DHA Phase 3', 'DHA Phase 4', 'DHA Phase 5', 'DHA Phase 6', 'DHA Phase 7', 'DHA Phase 8', 'DHA Phase 9',
      'Gulberg I', 'Gulberg II', 'Gulberg III', 'Gulberg IV', 'Gulberg V', 'Model Town', 'Johar Town', 'Faisal Town',
      'Iqbal Town', 'Garden Town', 'Sabzazar', 'Shahdara', 'Gulshan-e-Ravi', 'Samanabad', 'Ichhra', 'Mozang',
      'Anarkali', 'Mall Road', 'Liberty Market', 'Cavalry Ground', 'Walton', 'Harbanspura', 'Mughalpura', 'Baghbanpura',
      'Shalimar', 'Walled City', 'Bhati Gate', 'Delhi Gate', 'Shah Alam Market', 'Hall Road', 'Abbot Road', 'McLeod Road',
      'Garhi Shahu', 'Krishan Nagar', 'Sanda', 'Islampura', 'Misri Shah', 'Nishtar Colony', 'Gulshan-e-Lahore',
      'Valencia Town', 'Lake City', 'Paragon City', 'Al-Kabir Town', 'LDA Avenue', 'Raiwind Road', 'Ferozepur Road',
      'Multan Road', 'Canal Road', 'Jail Road', 'MM Alam Road', 'Main Boulevard Gulberg', 'Askari 1', 'Askari 5', 'Askari 10', 'Askari 11',
      'Cantt', 'Fortress Stadium', 'Tajpura', 'Sadar', 'Race Course', 'Jubilee Town', 'Bahria Town Lahore', 'Wapda Town',
      'Pia Society', 'Eden', 'New Muslim Town', 'Muslim Town', 'Rehmanpura', 'Allama Iqbal Town', 'Canal View', 'Thokar Niaz Baig'
    ]},
    { name: 'Faisalabad', region: 'punjab', areas: [
      'Peoples Colony No 1', 'Peoples Colony No 2', 'Madina Town', 'Gulberg', 'Susan Road', 'Canal Road', 'Jaranwala Road',
      'Sargodha Road', 'Satiana Road', 'Ghulam Muhammad Abad', 'Samanabad', 'Islam Nagar', 'Nishatabad', 'Jinnah Colony',
      'Model Town', 'Eden Garden', 'Faisal Garden', 'Kohinoor', 'Raza Abad', 'D Ground', 'Kutchery Bazaar', 'Rail Bazaar',
      'Montgomery Bazaar', 'Ghanta Ghar', 'Clock Tower', 'Millat Road', 'Narwala Road', 'Sheikhupura Road', 'Chak Jhumra Road',
      'Ayub Colony', 'Rehman City', 'Green Town', 'Gulistan Colony', 'Punjab Small Industries', 'SIT Colony', 'Batala Colony',
      'Officer Colony', 'Canal View', 'University Road', 'Agricultural University Area', 'Lyallpur Town'
    ]},
    { name: 'Multan', region: 'punjab', areas: [
      'Cantt', 'Gulgasht Colony', 'Shah Rukn-e-Alam', 'Mumtazabad', 'New Multan', 'Bosan Road', 'Model Town', 'Garden Town',
      'Shah Shams Colony', 'Gulshan-e-Madina', 'Bahawalpur Road', 'Vehari Road', 'Lodhran Road', 'Khanewal Road', 'Northern Bypass',
      'Southern Bypass', 'Multan Saddar', 'Hussain Agahi', 'Ghanta Ghar', 'Chungi No 6', 'Chungi No 9', 'MDA Chowk',
      'Nishtar Road', 'Abdali Road', 'Shah Rukn-e-Alam Colony', 'Askari Bypass', 'Wapda Town', 'Officers Colony', 'Judicial Colony',
      'Pir Mahal Colony', 'Makhdoom Rashid Road', 'Shujabad Road', 'Jalalpur Pirwala Road', 'Basti Nawab', 'Basti Shah Khurasan'
    ]},
    { name: 'Gujranwala', region: 'punjab', areas: [
      'Satellite Town', 'Model Town', 'Gulzar Colony', 'Peoples Colony', 'Civil Lines', 'Cantt', 'Gondlanwala Road',
      'Sialkot Road', 'Sheikhupura Road', 'GT Road', 'Wapda Town', 'Garden Town', 'Faisal Town', 'Rehmanpura', 'Islam Nagar',
      'Dhulle', 'Ghakhar', 'Eminabad Road', 'Kamoke Road', 'Nowshera Virkan Road', 'Jinnah Stadium Area', 'Clock Tower',
      'Rail Bazaar', 'Kutchery', 'Nishatabad', 'Gulshan Colony', 'Madina Colony', 'Askari Colony'
    ]},
    { name: 'Sialkot', region: 'punjab', areas: [
      'Cantt', 'Civil Lines', 'Model Town', 'Gulshan Colony', 'Saddar', 'Kutchery Road', 'Paris Road', 'Trunk Bazaar',
      'Allama Iqbal Road', 'Kashmir Road', 'Wazirabad Road', 'Daska Road', 'Pasrur Road', 'Airport Road', 'Gondal Road',
      'Haji Pura', 'Rangpura', 'Mujahid Road', 'Shahabpura', 'Neka Pura', 'Islam Nagar', 'Fateh Garh', 'Ugoki', 'Khadim Ali Road'
    ]},
    { name: 'Bahawalpur', region: 'punjab', areas: [
      'Model Town A', 'Model Town B', 'Model Town C', 'Satellite Town', 'Shahdara', 'Cantt', 'Civil Lines', 'Ahmadpur East Road',
      'Yazman Road', 'Hasilpur Road', 'Multan Road', 'Bahawalnagar Road', 'Noor Mahal Road', 'Dring Stadium Area', 'Gulzar Colony',
      'Rehman Colony', 'Islam Nagar', 'Faisal Colony', 'Jinnah Colony', 'Baghdad-ul-Jadeed', 'Abbasia Town', 'Dubai Mahal Road'
    ]},
    { name: 'Sargodha', region: 'punjab', areas: [
      'Satellite Town', 'Model Town', 'Civil Lines', 'Cantt', 'Saddar', 'University Road', 'Bhalwal Road', 'Mianwali Road',
      'Faisalabad Road', 'Lahore Road', 'Gulberg', 'Rehman Colony', 'Islam Nagar', 'Jinnah Colony', 'Factory Area', 'Kot Farid',
      'Shahpur Road', 'Sillanwali Road', 'Chak 46', 'Chak 47', 'Officers Colony', 'Airbase Area'
    ]},
    { name: 'Sheikhupura', region: 'punjab', areas: [
      'Civil Lines', 'Model Town', 'Satellite Town', 'GT Road', 'Lahore Road', 'Faisalabad Road', 'Safdarabad Road', 'Jandiala Sher Khan Road',
      'Hiran Minar Area', 'Qila Sheikhupura', 'Gulshan Colony', 'Rehmanpura', 'Islam Nagar', 'Faisal Colony', 'Nankana Road', 'Warburton Road'
    ]},
    { name: 'Jhang', region: 'punjab', areas: [
      'Civil Lines', 'Model Town', 'Satellite Town', 'Saddar', 'Chiniot Road', 'Sargodha Road', 'Multan Road', 'Faisalabad Road',
      'Gulberg', 'Rehman Colony', 'Islam Nagar', 'Jinnah Colony', 'Shah Jewna', 'Trimmu Road', 'Athara Hazari Road', 'Ahmadpur Sial Road'
    ]},
    { name: 'Gujrat', region: 'punjab', areas: [
      'Civil Lines', 'Model Town', 'Satellite Town', 'Cantt', 'Saddar', 'GT Road', 'Bhimber Road', 'Jalalpur Jattan Road',
      'Kunjah Road', 'Dinga Road', 'Sarai Alamgir Road', 'Gulberg', 'Rehman Colony', 'Islam Nagar', 'Faisal Colony', 'Shadiwal Road'
    ]},
    { name: 'Sahiwal', region: 'punjab', areas: [
      'Civil Lines', 'Model Town', 'Satellite Town', 'Saddar', 'Multan Road', 'Lahore Road', 'Okara Road', 'Chichawatni Road',
      'Gulberg', 'Rehman Colony', 'Islam Nagar', 'Jinnah Colony', 'Farid Town', 'Pakpattan Road', 'Harappa Area'
    ]},
    { name: 'Okara', region: 'punjab', areas: [
      'Civil Lines', 'Model Town', 'Satellite Town', 'Saddar', 'Depalpur Road', 'Renala Khurd Road', 'Sahiwal Road', 'Lahore Road',
      'Gulberg', 'Rehman Colony', 'Islam Nagar', 'Jinnah Colony', 'Haveli Lakha Road', 'Basirpur Road'
    ]},
    { name: 'Kasur', region: 'punjab', areas: [
      'Civil Lines', 'Model Town', 'Satellite Town', 'Saddar', 'Lahore Road', 'Kot Radha Kishan Road', 'Pattoki Road', 'Khudian Road',
      'Gulberg', 'Rehman Colony', 'Islam Nagar', 'Jinnah Colony', 'Chunian Road', 'Ganda Singh Wala Road'
    ]},
    { name: 'Rahim Yar Khan', region: 'punjab', areas: [
      'Model Town', 'Satellite Town', 'Civil Lines', 'Saddar', 'Cantt', 'Khanpur Road', 'Sadiqabad Road', 'Bahawalpur Road',
      'Liaquatpur Road', 'Kot Samaba', 'Gulberg', 'Rehman Colony', 'Islam Nagar', 'Jinnah Colony', 'Airport Road', 'Bypass Road'
    ]},
    { name: 'Dera Ghazi Khan', region: 'punjab', areas: [
      'Model Town', 'Satellite Town', 'Civil Lines', 'Saddar', 'Cantt', 'Multan Road', 'Taunsa Road', 'Rajanpur Road',
      'Sakhi Sarwar Road', 'Fort Munro Road', 'Gulberg', 'Rehman Colony', 'Islam Nagar', 'Jinnah Colony', 'Pul Dat', 'Block 1', 'Block 2'
    ]},
    { name: 'Wah Cantt', region: 'punjab', areas: [
      'Cantt', 'Askari 1', 'Askari 2', 'Askari 3', 'Gulberg', 'Model Town', 'Satellite Town', 'Taxila Road', 'GT Road',
      'Hassan Abadal Road', 'POF Colony', 'Wah Gardens', 'Rehman Colony', 'Islam Nagar', 'Officers Colony'
    ]},
    { name: 'Chiniot', region: 'punjab', areas: [
      'Civil Lines', 'Model Town', 'Satellite Town', 'Saddar', 'Faisalabad Road', 'Sargodha Road', 'Jhang Road', 'Chenab Nagar',
      'Gulberg', 'Rehman Colony', 'Islam Nagar', 'Lalian Road', 'Bhawana Road'
    ]},
    { name: 'Khanewal', region: 'punjab', areas: [
      'Civil Lines', 'Model Town', 'Satellite Town', 'Saddar', 'Multan Road', 'Jahanian Road', 'Mian Channu Road', 'Kabirwala Road',
      'Gulberg', 'Rehman Colony', 'Islam Nagar', 'Jinnah Colony'
    ]},
    { name: 'Vehari', region: 'punjab', areas: [
      'Civil Lines', 'Model Town', 'Satellite Town', 'Saddar', 'Multan Road', 'Burewala Road', 'Mailsi Road', 'Lodhran Road',
      'Gulberg', 'Rehman Colony', 'Islam Nagar', 'Jinnah Colony'
    ]},
    { name: 'Bahawalnagar', region: 'punjab', areas: [
      'Civil Lines', 'Model Town', 'Satellite Town', 'Saddar', 'Chishtian Road', 'Haroonabad Road', 'Fort Abbas Road', 'Minchinabad Road',
      'Gulberg', 'Rehman Colony', 'Islam Nagar', 'Jinnah Colony'
    ]},
    { name: 'Muzaffargarh', region: 'punjab', areas: [
      'Civil Lines', 'Model Town', 'Satellite Town', 'Saddar', 'Multan Road', 'DG Khan Road', 'Layyah Road', 'Kot Addu Road',
      'Gulberg', 'Rehman Colony', 'Islam Nagar', 'Jinnah Colony', 'Alipur Road', 'Jatoi Road'
    ]},
    { name: 'Hafizabad', region: 'punjab', areas: [
      'Civil Lines', 'Model Town', 'Satellite Town', 'Saddar', 'Gujranwala Road', 'Pindi Bhattian Road', 'Sukheke Road', 'Jalalpur Bhattian Road',
      'Gulberg', 'Rehman Colony', 'Islam Nagar'
    ]},
    { name: 'Mandi Bahauddin', region: 'punjab', areas: [
      'Civil Lines', 'Model Town', 'Satellite Town', 'Saddar', 'Gujrat Road', 'Phalia Road', 'Malakwal Road', 'Dinga Road',
      'Gulberg', 'Rehman Colony', 'Islam Nagar'
    ]},
    { name: 'Jhelum', region: 'punjab', areas: [
      'Civil Lines', 'Model Town', 'Satellite Town', 'Cantt', 'Saddar', 'GT Road', 'Sohawa Road', 'Pind Dadan Khan Road',
      'Dina Road', 'Sarai Alamgir Road', 'Gulberg', 'Rehman Colony', 'Islam Nagar', 'Machine Mohalla'
    ]},
    { name: 'Chakwal', region: 'punjab', areas: [
      'Civil Lines', 'Model Town', 'Satellite Town', 'Saddar', 'Talagang Road', 'Choa Saidan Shah Road', 'Kallar Kahar Road', 'Dhudial Road',
      'Gulberg', 'Rehman Colony', 'Islam Nagar'
    ]},
    { name: 'Attock', region: 'punjab', areas: [
      'Civil Lines', 'Model Town', 'Satellite Town', 'Cantt', 'Saddar', 'GT Road', 'Hazro Road', 'Pindi Gheb Road', 'Fateh Jang Road',
      'Gulberg', 'Rehman Colony', 'Islam Nagar', 'Kamalpur Road'
    ]},
    { name: 'Mianwali', region: 'punjab', areas: [
      'Civil Lines', 'Model Town', 'Satellite Town', 'Saddar', 'Sargodha Road', 'Bhakkar Road', 'Isa Khel Road', 'Kalabagh Road',
      'Gulberg', 'Rehman Colony', 'Islam Nagar', 'Piplan Road'
    ]},
    { name: 'Bhakkar', region: 'punjab', areas: [
      'Civil Lines', 'Model Town', 'Satellite Town', 'Saddar', 'Mianwali Road', 'Layyah Road', 'Darya Khan Road', 'Kot Adu Road',
      'Gulberg', 'Rehman Colony', 'Islam Nagar'
    ]},
    { name: 'Layyah', region: 'punjab', areas: [
      'Civil Lines', 'Model Town', 'Satellite Town', 'Saddar', 'Muzaffargarh Road', 'Bhakkar Road', 'Karor Lal Esan Road', 'Choubara Road',
      'Gulberg', 'Rehman Colony', 'Islam Nagar'
    ]},
    { name: 'Lodhran', region: 'punjab', areas: [
      'Civil Lines', 'Model Town', 'Satellite Town', 'Saddar', 'Multan Road', 'Vehari Road', 'Kahror Pacca Road', 'Dunyapur Road',
      'Gulberg', 'Rehman Colony', 'Islam Nagar'
    ]},
    { name: 'Pakpattan', region: 'punjab', areas: [
      'Civil Lines', 'Model Town', 'Satellite Town', 'Saddar', 'Sahiwal Road', 'Arifwala Road', 'Burewala Road', 'Vehari Road',
      'Gulberg', 'Rehman Colony', 'Islam Nagar', 'Shrine Area'
    ]},
    { name: 'Toba Tek Singh', region: 'punjab', areas: [
      'Civil Lines', 'Model Town', 'Satellite Town', 'Saddar', 'Faisalabad Road', 'Gojra Road', 'Kamalia Road', 'Pir Mahal Road',
      'Gulberg', 'Rehman Colony', 'Islam Nagar'
    ]},
    { name: 'Narowal', region: 'punjab', areas: [
      'Civil Lines', 'Model Town', 'Satellite Town', 'Saddar', 'Sialkot Road', 'Shakargarh Road', 'Zafarwal Road', 'Narowal Bypass',
      'Gulberg', 'Rehman Colony', 'Islam Nagar'
    ]},
    { name: 'Khushab', region: 'punjab', areas: [
      'Civil Lines', 'Model Town', 'Satellite Town', 'Saddar', 'Sargodha Road', 'Mianwali Road', 'Jauharabad Road', 'Quaidabad Road',
      'Gulberg', 'Rehman Colony', 'Islam Nagar', 'Noorpur Thal Road'
    ]},
    { name: 'Kamoke', region: 'punjab', areas: [
      'Civil Lines', 'Model Town', 'GT Road', 'Gujranwala Road', 'Lahore Road', 'Eminabad Road', 'Gulberg', 'Rehman Colony', 'Islam Nagar'
    ]},
    { name: 'Muridke', region: 'punjab', areas: [
      'Civil Lines', 'Model Town', 'GT Road', 'Lahore Road', 'Sheikhupura Road', 'Narang Mandi Road', 'Gulberg', 'Rehman Colony', 'Islam Nagar'
    ]},
    { name: 'Daska', region: 'punjab', areas: [
      'Civil Lines', 'Model Town', 'Sialkot Road', 'Gujranwala Road', 'Pasrur Road', 'Sambrial Road', 'Gulberg', 'Rehman Colony', 'Islam Nagar'
    ]},
    { name: 'Gojra', region: 'punjab', areas: [
      'Civil Lines', 'Model Town', 'Faisalabad Road', 'Toba Tek Singh Road', 'Saddar', 'Gulberg', 'Rehman Colony', 'Islam Nagar'
    ]},
    { name: 'Sadiqabad', region: 'punjab', areas: [
      'Model Town', 'Satellite Town', 'Saddar', 'Rahim Yar Khan Road', 'Khanpur Road', 'Kot Samaba', 'Gulberg', 'Rehman Colony', 'Islam Nagar'
    ]},
    { name: 'Khanpur', region: 'punjab', areas: [
      'Model Town', 'Satellite Town', 'Saddar', 'Rahim Yar Khan Road', 'Liaquatpur Road', 'Kot Samaba', 'Gulberg', 'Rehman Colony', 'Islam Nagar'
    ]},
    { name: 'Burewala', region: 'punjab', areas: [
      'Model Town', 'Satellite Town', 'Saddar', 'Vehari Road', 'Pakpattan Road', 'Mailsi Road', 'Gulberg', 'Rehman Colony', 'Islam Nagar'
    ]},
    { name: 'Hasilpur', region: 'punjab', areas: [
      'Model Town', 'Satellite Town', 'Saddar', 'Bahawalpur Road', 'Bahawalnagar Road', 'Gulberg', 'Rehman Colony', 'Islam Nagar'
    ]},
    { name: 'Ahmadpur East', region: 'punjab', areas: [
      'Model Town', 'Satellite Town', 'Saddar', 'Bahawalpur Road', 'Uch Sharif Road', 'Gulberg', 'Rehman Colony', 'Islam Nagar'
    ]},
    { name: 'Jalalpur Pirwala', region: 'punjab', areas: [
      'Model Town', 'Satellite Town', 'Saddar', 'Multan Road', 'Lodhran Road', 'Gulberg', 'Rehman Colony', 'Islam Nagar'
    ]},
    { name: 'Taxila', region: 'punjab', areas: [
      'Civil Lines', 'Model Town', 'Cantt', 'GT Road', 'Wah Road', 'Hassan Abadal Road', 'Hattar Road', 'Gulberg', 'Rehman Colony', 'Islam Nagar', 'Museum Area'
    ]},
    { name: 'Hattar', region: 'kpk', areas: [
      'Industrial Estate', 'Model Town', 'GT Road', 'Haripur Road', 'Taxila Road', 'Gulberg', 'Rehman Colony'
    ]},

    // ---------------- Sindh ----------------
    { name: 'Karachi', region: 'sindh', areas: [
      'Clifton Block 1', 'Clifton Block 2', 'Clifton Block 3', 'Clifton Block 4', 'Clifton Block 5', 'Clifton Block 6', 'Clifton Block 7', 'Clifton Block 8', 'Clifton Block 9',
      'DHA Phase 1', 'DHA Phase 2', 'DHA Phase 2 Extension', 'DHA Phase 4', 'DHA Phase 5', 'DHA Phase 6', 'DHA Phase 7', 'DHA Phase 8',
      'Gulshan-e-Iqbal Block 1', 'Gulshan-e-Iqbal Block 2', 'Gulshan-e-Iqbal Block 3', 'Gulshan-e-Iqbal Block 4', 'Gulshan-e-Iqbal Block 5',
      'Gulshan-e-Iqbal Block 6', 'Gulshan-e-Iqbal Block 7', 'Gulshan-e-Iqbal Block 8', 'Gulshan-e-Iqbal Block 9', 'Gulshan-e-Iqbal Block 10',
      'Gulshan-e-Iqbal Block 13', 'Gulshan-e-Iqbal Block 15', 'Gulistan-e-Johar', 'Gulshan-e-Maymar', 'Scheme 33',
      'North Nazimabad Block A', 'North Nazimabad Block B', 'North Nazimabad Block C', 'North Nazimabad Block D', 'North Nazimabad Block H',
      'North Nazimabad Block L', 'North Nazimabad Block M', 'North Nazimabad Block N', 'North Nazimabad Block S', 'North Nazimabad Block T',
      'Federal B Area', 'FB Area Block 1', 'FB Area Block 7', 'FB Area Block 9', 'FB Area Block 15', 'FB Area Block 20',
      'Nazimabad', 'Liaquatabad', 'Gulberg Town', 'Saddar', 'PECHS', 'Bahadurabad', 'Tariq Road', 'Shahrah-e-Faisal',
      'Malir', 'Malir Cantt', 'Model Colony', 'Korangi', 'Landhi', 'SITE', 'Orangi Town', 'Baldia Town', 'Keamari',
      'Lyari', 'Kharadar', 'Mithadar', 'Boulton Market', 'II Chundrigar Road', 'Burns Road', 'Lucky Star', 'Garden',
      'Gulshan-e-Hadeed', 'Bin Qasim', 'Shah Latif Town', 'Surjani Town', 'New Karachi', 'Godhra', 'North Karachi',
      'Buffer Zone', 'Hyderi', 'Five Star Chowk', 'Nipa', 'Maskan', 'Sohrab Goth', 'Water Pump', 'Aisha Manzil',
      'Karachi University Area', 'Sakhi Hassan', 'Power House', 'UP Mor', 'Sultanabad', 'Dhoraji', 'Manzoor Colony',
      'Akhtar Colony', 'Mahmudabad', 'Kashmir Colony', 'Pehalwan Goth', 'Rashid Minhas Road', 'Stadium Road', 'National Stadium Area',
      'Askari 1', 'Askari 2', 'Askari 3', 'Askari 4', 'Askari 5', 'Creek Vista', 'Emaar Crescent Bay', 'Bahria Town Karachi',
      'Bahria Sports City', 'DHA City Karachi', 'Naya Nazimabad', 'Gadap Town', 'Hawksbay', 'Sandspit', 'Manora', 'Kiamari'
    ]},
    { name: 'Hyderabad', region: 'sindh', areas: [
      'Latifabad Unit 1', 'Latifabad Unit 2', 'Latifabad Unit 3', 'Latifabad Unit 4', 'Latifabad Unit 5', 'Latifabad Unit 6',
      'Latifabad Unit 7', 'Latifabad Unit 8', 'Latifabad Unit 9', 'Latifabad Unit 10', 'Qasimabad', 'Citizen Colony',
      'Hirabad', 'Market Area', 'Saddar', 'Cantt', 'Auto Bhan Road', 'Thandi Sarak', 'Shahbaz Town', 'Gulshan-e-Sindhi',
      'Wadhu Wah', 'Hussainabad', 'Bhitai Nagar', 'Jamshoro Road', 'Kotri Road', 'Tando Jam Road', 'Hala Naka', 'Sachal Sarmast Colony'
    ]},
    { name: 'Sukkur', region: 'sindh', areas: [
      'Barrage Road', 'Minara Road', 'Saddar', 'Cantt', 'Military Road', 'Airport Road', 'Rohri Road', 'Shikarpur Road',
      'Larkana Road', 'Khairpur Road', 'Gulshan Colony', 'Model Town', 'Satellite Town', 'Bunder Road', 'Station Road', 'Workshop Road'
    ]},
    { name: 'Larkana', region: 'sindh', areas: [
      'Saddar', 'Cantt', 'Model Town', 'Satellite Town', 'Station Road', 'Ratodero Road', 'Kamber Road', 'Dokri Road',
      'Mohenjo Daro Road', 'Gulshan Colony', 'Rehman Colony', 'Islam Nagar', 'Jinnah Bagh', 'Lahori Muhalla'
    ]},
    { name: 'Mirpur Khas', region: 'sindh', areas: [
      'Saddar', 'Cantt', 'Model Town', 'Satellite Town', 'Hyderabad Road', 'Umerkot Road', 'Digri Road', 'Kot Ghulam Muhammad Road',
      'Gulshan Colony', 'Rehman Colony', 'Islam Nagar', 'Station Road', 'Khipro Road'
    ]},
    { name: 'Nawabshah', region: 'sindh', areas: [
      'Saddar', 'Cantt', 'Model Town', 'Satellite Town', 'Sakrand Road', 'Daur Road', 'Kazi Ahmed Road', 'Moro Road',
      'Gulshan Colony', 'Rehman Colony', 'Islam Nagar', 'Station Road', 'Bypass Road'
    ]},
    { name: 'Jacobabad', region: 'sindh', areas: [
      'Saddar', 'Cantt', 'Model Town', 'Satellite Town', 'Sukkur Road', 'Larkana Road', 'Kashmore Road', 'Thul Road',
      'Gulshan Colony', 'Rehman Colony', 'Islam Nagar', 'Station Road'
    ]},
    { name: 'Shikarpur', region: 'sindh', areas: [
      'Saddar', 'Model Town', 'Satellite Town', 'Sukkur Road', 'Larkana Road', 'Jacobabad Road', 'Khanpur Road',
      'Gulshan Colony', 'Rehman Colony', 'Islam Nagar', 'Lakhi Road'
    ]},
    { name: 'Khairpur', region: 'sindh', areas: [
      'Saddar', 'Model Town', 'Satellite Town', 'Sukkur Road', 'Nawabshah Road', 'Kot Diji Road', 'Gambat Road', 'Kingri Road',
      'Gulshan Colony', 'Rehman Colony', 'Islam Nagar', 'Faiz Mahal Area'
    ]},
    { name: 'Dadu', region: 'sindh', areas: [
      'Saddar', 'Model Town', 'Satellite Town', 'Hyderabad Road', 'Larkana Road', 'Mehar Road', 'Johi Road', 'Sehwan Road',
      'Gulshan Colony', 'Rehman Colony', 'Islam Nagar'
    ]},
    { name: 'Thatta', region: 'sindh', areas: [
      'Saddar', 'Model Town', 'Satellite Town', 'Karachi Road', 'Sujawal Road', 'Mirpur Sakro Road', 'Gharo Road', 'Makli Area',
      'Gulshan Colony', 'Rehman Colony', 'Islam Nagar'
    ]},
    { name: 'Badin', region: 'sindh', areas: [
      'Saddar', 'Model Town', 'Satellite Town', 'Hyderabad Road', 'Tando Bago Road', 'Talhar Road', 'Matli Road', 'Golarchi Road',
      'Gulshan Colony', 'Rehman Colony', 'Islam Nagar'
    ]},
    { name: 'Umerkot', region: 'sindh', areas: [
      'Saddar', 'Model Town', 'Satellite Town', 'Mirpur Khas Road', 'Kunri Road', 'Samaro Road', 'Pithoro Road', 'Chhor Road',
      'Gulshan Colony', 'Rehman Colony', 'Islam Nagar', 'Fort Area'
    ]},
    { name: 'Sanghar', region: 'sindh', areas: [
      'Saddar', 'Model Town', 'Satellite Town', 'Nawabshah Road', 'Mirpur Khas Road', 'Shahdadpur Road', 'Sinjhoro Road', 'Khipro Road',
      'Gulshan Colony', 'Rehman Colony', 'Islam Nagar'
    ]},
    { name: 'Ghotki', region: 'sindh', areas: [
      'Saddar', 'Model Town', 'Satellite Town', 'Sukkur Road', 'Kashmore Road', 'Mirpur Mathelo Road', 'Daharki Road', 'Ubauro Road',
      'Gulshan Colony', 'Rehman Colony', 'Islam Nagar'
    ]},
    { name: 'Kotri', region: 'sindh', areas: [
      'Saddar', 'Model Town', 'Satellite Town', 'Hyderabad Road', 'Jamshoro Road', 'Nooriabad Road', 'Gulshan Colony', 'Rehman Colony', 'Islam Nagar'
    ]},
    { name: 'Jamshoro', region: 'sindh', areas: [
      'University Area', 'Saddar', 'Model Town', 'Hyderabad Road', 'Karachi Road', 'Kotri Road', 'Nooriabad Road', 'Gulshan Colony', 'Rehman Colony'
    ]},

    // ---------------- Khyber Pakhtunkhwa ----------------
    { name: 'Peshawar', region: 'kpk', areas: [
      'University Town', 'Hayatabad Phase 1', 'Hayatabad Phase 2', 'Hayatabad Phase 3', 'Hayatabad Phase 4', 'Hayatabad Phase 5',
      'Hayatabad Phase 6', 'Hayatabad Phase 7', 'Gulberg', 'Cantt', 'Saddar', 'Khyber Bazaar', 'Qissa Khwani Bazaar', 'Namak Mandi',
      'Sikandar Town', 'Faqirabad', 'Gulshan Colony', 'Danish Abad', 'Warsak Road', 'Ring Road', 'Kohat Road', 'GT Road',
      'Charsadda Road', 'Dalazak Road', 'Pajjaggi Road', 'Bara Road', 'Jamrud Road', 'Board Bazaar', 'Tehkal', 'Achar',
      'Pishtakhara', 'Dabgari Gardens', 'Sethi Mohallah', 'Mohallah Jangi', 'Kucha Risaldar', 'Cinema Road', 'Mall Road'
    ]},
    { name: 'Mardan', region: 'kpk', areas: [
      'Cantt', 'Saddar', 'Model Town', 'Satellite Town', 'University Road', 'Nowshera Road', 'Swabi Road', 'Charsadda Road',
      'Katlang Road', 'Takht Bhai Road', 'Gulberg', 'Gulshan Colony', 'Rehman Colony', 'Islam Nagar', 'Sheikh Maltoon Town', 'Baghicha'
    ]},
    { name: 'Abbottabad', region: 'kpk', areas: [
      'Cantt', 'Saddar', 'Model Town', 'Satellite Town', 'Mandian', 'Jinnahabad', 'Nawan Shehr', 'Supply Bazaar', 'Kakul Road',
      'Murree Road', 'Havelian Road', 'Mansehra Road', 'Thandiani Road', 'Gulberg', 'Gulshan Colony', 'Rehman Colony', 'Islam Nagar',
      'Fawara Chowk', 'Commissionery Bazaar', 'PMA Area', 'Ayub Medical Area'
    ]},
    { name: 'Mingora', region: 'kpk', areas: [
      'Saddar', 'Model Town', 'Satellite Town', 'Saidu Sharif', 'Green Chowk', 'Mingora Bypass', 'Kabal Road', 'Matta Road',
      'Khwazakhela Road', 'Bahrain Road', 'Gulberg', 'Gulshan Colony', 'Rehman Colony', 'Islam Nagar', 'Fizagat'
    ]},
    { name: 'Kohat', region: 'kpk', areas: [
      'Cantt', 'Saddar', 'Model Town', 'Satellite Town', 'Peshawar Road', 'Hangu Road', 'Karak Road', 'Bannu Road',
      'Gulberg', 'Gulshan Colony', 'Rehman Colony', 'Islam Nagar', 'Jarma', 'Togh'
    ]},
    { name: 'Dera Ismail Khan', region: 'kpk', areas: [
      'Cantt', 'Saddar', 'Model Town', 'Satellite Town', 'Bannu Road', 'Tank Road', 'Mianwali Road', 'Multan Road',
      'Gulberg', 'Gulshan Colony', 'Rehman Colony', 'Islam Nagar', 'Paharpur', 'Draban Road'
    ]},
    { name: 'Nowshera', region: 'kpk', areas: [
      'Cantt', 'Saddar', 'Model Town', 'Satellite Town', 'Risalpur', 'Peshawar Road', 'Mardan Road', 'GT Road',
      'Gulberg', 'Gulshan Colony', 'Rehman Colony', 'Islam Nagar', 'Akramabad', 'Aman Kot'
    ]},
    { name: 'Swabi', region: 'kpk', areas: [
      'Saddar', 'Model Town', 'Satellite Town', 'Mardan Road', 'Peshawar Road', 'Topi Road', 'Lahor Road', 'Gulberg',
      'Gulshan Colony', 'Rehman Colony', 'Islam Nagar', 'GIKI Area', 'Kunda'
    ]},
    { name: 'Charsadda', region: 'kpk', areas: [
      'Saddar', 'Model Town', 'Satellite Town', 'Peshawar Road', 'Mardan Road', 'Tangi Road', 'Shabqadar Road', 'Rajjar Road',
      'Gulberg', 'Gulshan Colony', 'Rehman Colony', 'Islam Nagar', 'Umarzai'
    ]},
    { name: 'Mansehra', region: 'kpk', areas: [
      'Saddar', 'Model Town', 'Satellite Town', 'Abbottabad Road', 'Balakot Road', 'Shinkiari Road', 'Oghi Road', 'Baffa Road',
      'Gulberg', 'Gulshan Colony', 'Rehman Colony', 'Islam Nagar'
    ]},
    { name: 'Haripur', region: 'kpk', areas: [
      'Saddar', 'Model Town', 'Satellite Town', 'Hattar Road', 'Abbottabad Road', 'Khalabat Road', 'Ghazi Road', 'Tarbela Road',
      'Gulberg', 'Gulshan Colony', 'Rehman Colony', 'Islam Nagar'
    ]},
    { name: 'Bannu', region: 'kpk', areas: [
      'Cantt', 'Saddar', 'Model Town', 'Satellite Town', 'Kohat Road', 'DI Khan Road', 'Lakki Marwat Road', 'Miranshah Road',
      'Gulberg', 'Gulshan Colony', 'Rehman Colony', 'Islam Nagar'
    ]},
    { name: 'Hangu', region: 'kpk', areas: [
      'Saddar', 'Model Town', 'Satellite Town', 'Kohat Road', 'Thall Road', 'Parachinar Road', 'Gulberg', 'Gulshan Colony', 'Rehman Colony', 'Islam Nagar'
    ]},
    { name: 'Karak', region: 'kpk', areas: [
      'Saddar', 'Model Town', 'Satellite Town', 'Kohat Road', 'Bannu Road', 'Takht-e-Nasrati Road', 'Gulberg', 'Gulshan Colony', 'Rehman Colony', 'Islam Nagar'
    ]},
    { name: 'Lakki Marwat', region: 'kpk', areas: [
      'Saddar', 'Model Town', 'Satellite Town', 'Bannu Road', 'DI Khan Road', 'Serai Naurang Road', 'Gulberg', 'Gulshan Colony', 'Rehman Colony', 'Islam Nagar'
    ]},
    { name: 'Chitral', region: 'kpk', areas: [
      'Saddar', 'Model Town', 'Satellite Town', 'Shahbaz Bazaar', 'Airport Road', 'Booni Road', 'Mastuj Road', 'Garam Chashma Road',
      'Gulberg', 'Gulshan Colony', 'Rehman Colony', 'Islam Nagar', 'Danin'
    ]},
    { name: 'Dir', region: 'kpk', areas: [
      'Saddar', 'Model Town', 'Satellite Town', 'Timergara', 'Wari Road', 'Talash Road', 'Khal Road', 'Gulberg', 'Gulshan Colony', 'Rehman Colony', 'Islam Nagar'
    ]},
    { name: 'Malakand', region: 'kpk', areas: [
      'Saddar', 'Model Town', 'Batkhela', 'Dargai', 'Thana Road', 'Swat Road', 'Gulberg', 'Gulshan Colony', 'Rehman Colony', 'Islam Nagar'
    ]},
    { name: 'Buner', region: 'kpk', areas: [
      'Saddar', 'Model Town', 'Daggar', 'Swari', 'Gagra', 'Chamla', 'Gulberg', 'Gulshan Colony', 'Rehman Colony', 'Islam Nagar'
    ]},
    { name: 'Shangla', region: 'kpk', areas: [
      'Saddar', 'Model Town', 'Alpuri', 'Besham', 'Pattan', 'Chakesar', 'Gulberg', 'Gulshan Colony', 'Rehman Colony', 'Islam Nagar'
    ]},
    { name: 'Tank', region: 'kpk', areas: [
      'Saddar', 'Model Town', 'Satellite Town', 'DI Khan Road', 'Jandola Road', 'Gulberg', 'Gulshan Colony', 'Rehman Colony', 'Islam Nagar'
    ]},

    // ---------------- Balochistan ----------------
    { name: 'Quetta', region: 'balochistan', areas: [
      'Cantt', 'Saddar', 'Jinnah Town', 'Samungli Road', 'Airport Road', 'Brewery Road', 'Zarghoon Road', 'Liaquat Bazaar',
      'Kandahari Bazaar', 'Suraj Road', 'Prince Road', 'Mir Qambar Ali Road', 'Sariab Road', 'Eastern Bypass', 'Western Bypass',
      'Satellite Town', 'Model Town', 'Gulberg', 'Gulshan Colony', 'Rehman Colony', 'Islam Nagar', 'Alamdar Road', 'Hazara Town',
      'Marriabad', 'Kuchlak', 'Baleli', 'Killi Ismail', 'Killi Bangulzai', 'Sheikh Manda', 'Joint Road', 'Meezan Chowk'
    ]},
    { name: 'Gwadar', region: 'balochistan', areas: [
      'Saddar', 'Model Town', 'Satellite Town', 'Port Area', 'Free Zone', 'Jiwani Road', 'Pasni Road', 'Turbat Road',
      'Gulberg', 'Gulshan Colony', 'Rehman Colony', 'Islam Nagar', 'New Town', 'Shahi Tump', 'Koh-e-Batil'
    ]},
    { name: 'Turbat', region: 'balochistan', areas: [
      'Saddar', 'Model Town', 'Satellite Town', 'Gwadar Road', 'Panjgur Road', 'Awaran Road', 'Absor Road', 'Buleda Road',
      'Gulberg', 'Gulshan Colony', 'Rehman Colony', 'Islam Nagar'
    ]},
    { name: 'Khuzdar', region: 'balochistan', areas: [
      'Saddar', 'Model Town', 'Satellite Town', 'Quetta Road', 'Karachi Road', 'Kalat Road', 'Wadh Road', 'Zehri Road',
      'Gulberg', 'Gulshan Colony', 'Rehman Colony', 'Islam Nagar'
    ]},
    { name: 'Hub', region: 'balochistan', areas: [
      'Saddar', 'Model Town', 'Satellite Town', 'Karachi Road', 'Hub Chowki', 'Industrial Area', 'Gaddani Road', 'Winder Road',
      'Gulberg', 'Gulshan Colony', 'Rehman Colony', 'Islam Nagar'
    ]},
    { name: 'Chaman', region: 'balochistan', areas: [
      'Saddar', 'Model Town', 'Satellite Town', 'Quetta Road', 'Border Area', 'Gulberg', 'Gulshan Colony', 'Rehman Colony', 'Islam Nagar'
    ]},
    { name: 'Loralai', region: 'balochistan', areas: [
      'Saddar', 'Model Town', 'Satellite Town', 'Quetta Road', 'Zhob Road', 'Duki Road', 'Bori Road', 'Gulberg', 'Gulshan Colony', 'Rehman Colony', 'Islam Nagar'
    ]},
    { name: 'Zhob', region: 'balochistan', areas: [
      'Saddar', 'Model Town', 'Satellite Town', 'Quetta Road', 'DI Khan Road', 'Loralai Road', 'Sherani Road', 'Gulberg', 'Gulshan Colony', 'Rehman Colony', 'Islam Nagar'
    ]},
    { name: 'Sibi', region: 'balochistan', areas: [
      'Saddar', 'Model Town', 'Satellite Town', 'Quetta Road', 'Sukkur Road', 'Harnai Road', 'Duki Road', 'Gulberg', 'Gulshan Colony', 'Rehman Colony', 'Islam Nagar'
    ]},
    { name: 'Kalat', region: 'balochistan', areas: [
      'Saddar', 'Model Town', 'Satellite Town', 'Quetta Road', 'Khuzdar Road', 'Mangochar Road', 'Gulberg', 'Gulshan Colony', 'Rehman Colony', 'Islam Nagar'
    ]},
    { name: 'Panjgur', region: 'balochistan', areas: [
      'Saddar', 'Model Town', 'Satellite Town', 'Turbat Road', 'Kharan Road', 'Gowargo Road', 'Gulberg', 'Gulshan Colony', 'Rehman Colony', 'Islam Nagar'
    ]},
    { name: 'Kharan', region: 'balochistan', areas: [
      'Saddar', 'Model Town', 'Satellite Town', 'Quetta Road', 'Panjgur Road', 'Washuk Road', 'Gulberg', 'Gulshan Colony', 'Rehman Colony', 'Islam Nagar'
    ]},
    { name: 'Lasbela', region: 'balochistan', areas: [
      'Saddar', 'Model Town', 'Uthal', 'Bela', 'Hub Road', 'Karachi Road', 'Gaddani', 'Sonmiani', 'Gulberg', 'Gulshan Colony', 'Rehman Colony'
    ]},

    // ---------------- Gilgit-Baltistan ----------------
    { name: 'Gilgit', region: 'gb', areas: [
      'Saddar', 'Model Town', 'Satellite Town', 'Jutial', 'Konodas', 'Danyore', 'Oshkhandas', 'Nagral', 'Barmas', 'Majipora',
      'Airport Road', 'KKH', 'Skardu Road', 'Chilas Road', 'Gulberg', 'Gulshan Colony', 'Rehman Colony', 'Islam Nagar', 'Bonyar'
    ]},
    { name: 'Skardu', region: 'gb', areas: [
      'Saddar', 'Model Town', 'Satellite Town', 'Airport Road', 'Shigar Road', 'Khaplu Road', 'Satpara Road', 'Sadpara',
      'Gulberg', 'Gulshan Colony', 'Rehman Colony', 'Islam Nagar', 'Hussainabad', 'New Town'
    ]},
    { name: 'Hunza', region: 'gb', areas: [
      'Aliabad', 'Karimabad', 'Ganish', 'Altit', 'Baltit', 'Murtazabad', 'Hyderabad', 'Nasirabad', 'Shimshal', 'Gulmit', 'Passu', 'Sost'
    ]},
    { name: 'Chilas', region: 'gb', areas: [
      'Saddar', 'Model Town', 'KKH', 'Babusar Road', 'Gulberg', 'Gulshan Colony', 'Rehman Colony', 'Islam Nagar'
    ]},
    { name: 'Ghanche', region: 'gb', areas: [
      'Khaplu', 'Saddar', 'Model Town', 'Skardu Road', 'Hushe Road', 'Gulberg', 'Gulshan Colony', 'Rehman Colony'
    ]},
    { name: 'Astore', region: 'gb', areas: [
      'Saddar', 'Model Town', 'Eidgah', 'Rama', 'Rattu', 'Gulberg', 'Gulshan Colony', 'Rehman Colony'
    ]},

    // ---------------- Azad Jammu & Kashmir ----------------
    { name: 'Muzaffarabad', region: 'ajk', areas: [
      'Saddar', 'Model Town', 'Satellite Town', 'Upper Plate', 'Lower Plate', 'Chattar', 'Muzaffarabad Bypass', 'Neelum Road',
      'Hattian Road', 'Bagh Road', 'Kohala Road', 'Gulberg', 'Gulshan Colony', 'Rehman Colony', 'Islam Nagar', 'Ambore'
    ]},
    { name: 'Mirpur', region: 'ajk', areas: [
      'Saddar', 'Model Town', 'Satellite Town', 'Allama Iqbal Road', 'Dadyal Road', 'Dudhnial Road', 'Kotli Road', 'Islamgarh Road',
      'Gulberg', 'Gulshan Colony', 'Rehman Colony', 'Islam Nagar', 'New City', 'Sector F'
    ]},
    { name: 'Kotli', region: 'ajk', areas: [
      'Saddar', 'Model Town', 'Satellite Town', 'Mirpur Road', 'Rawalakot Road', 'Sehnsa Road', 'Nakyal Road', 'Gulberg',
      'Gulshan Colony', 'Rehman Colony', 'Islam Nagar'
    ]},
    { name: 'Rawalakot', region: 'ajk', areas: [
      'Saddar', 'Model Town', 'Satellite Town', 'Bagh Road', 'Hajira Road', 'Khuiratta Road', 'Tarkhala', 'Gulberg',
      'Gulshan Colony', 'Rehman Colony', 'Islam Nagar'
    ]},
    { name: 'Bagh', region: 'ajk', areas: [
      'Saddar', 'Model Town', 'Satellite Town', 'Rawalakot Road', 'Muzaffarabad Road', 'Dhirkot Road', 'Haveli Road', 'Gulberg',
      'Gulshan Colony', 'Rehman Colony', 'Islam Nagar'
    ]},
    { name: 'Bhimber', region: 'ajk', areas: [
      'Saddar', 'Model Town', 'Satellite Town', 'Mirpur Road', 'Barnala Road', 'Samahni Road', 'Gulberg', 'Gulshan Colony', 'Rehman Colony', 'Islam Nagar'
    ]},
    { name: 'Pallandri', region: 'ajk', areas: [
      'Saddar', 'Model Town', 'Satellite Town', 'Rawalakot Road', 'Mong Road', 'Trarkhel Road', 'Gulberg', 'Gulshan Colony', 'Rehman Colony'
    ]},
    { name: 'Hattian Bala', region: 'ajk', areas: [
      'Saddar', 'Model Town', 'Muzaffarabad Road', 'Chikar Road', 'Leepa Road', 'Gulberg', 'Gulshan Colony', 'Rehman Colony'
    ]},
    { name: 'Neelum', region: 'ajk', areas: [
      'Athmuqam', 'Saddar', 'Model Town', 'Keran', 'Sharda', 'Kel', 'Taobat', 'Gulberg', 'Gulshan Colony', 'Rehman Colony'
    ]}
  ]
};

// Reference data only. Expose to the browser and to require() for tests.
if (typeof window !== 'undefined') {
  window.EVORA_LOCATIONS = EVORA_LOCATIONS;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = EVORA_LOCATIONS;
}