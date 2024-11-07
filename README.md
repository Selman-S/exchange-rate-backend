Elbette, size bu görevi adım adım nasıl gerçekleştireceğinizi, her adımı detaylı açıklamalarla birlikte anlatacağım. Bu süreçte temiz kod yazma prensiplerine dikkat ederek, hem işlevsel hem de sürdürülebilir bir REST API oluşturacağız. Aşağıdaki adımları takip ederek, PHP ve MySQL kullanarak `webinars` adlı tabloyu içeren bir REST API geliştireceğiz.

## **Adım 1: MySQL Veritabanı Hazırlığı**

### **1.1. Veritabanı ve Tablo Oluşturma**

Öncelikle, MySQL veritabanınızda `webinars` adında bir tablo oluşturacağız. Bu tablo, webinar bilgilerini depolamak için gerekli sütunları içerecek.

#### **1.1.1. Veritabanı Bağlantısı**

Eğer henüz bir veritabanı oluşturmadıysanız, önce bir veritabanı oluşturmalısınız. Örneğin, `my_database` adında bir veritabanı oluşturabilirsiniz:

```sql
CREATE DATABASE my_database;
```

#### **1.1.2. `webinars` Tablosunun Oluşturulması**

Aşağıdaki SQL komutları ile `webinars` tablosunu oluşturacağız:

```sql
USE my_database;

CREATE TABLE webinars (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    date DATETIME NOT NULL,
    status TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Açıklamalar:**

- `id`: Her webinar için benzersiz bir tanımlayıcıdır. `AUTO_INCREMENT` özelliği sayesinde her yeni kayıt otomatik olarak artar.
- `title`: Webinarın başlığıdır. `VARCHAR(255)` ile maksimum 255 karakter desteklenir.
- `description`: Webinarın açıklamasını içerir. `TEXT` tipi, uzun metinler için uygundur.
- `date`: Webinarın gerçekleşeceği tarih ve saat bilgisidir. `DATETIME` tipi kullanılmıştır.
- `status`: Webinarın aktif (`1`) veya pasif (`0`) olduğunu belirtir. Varsayılan değer `1`'dir.
- `created_at`: Kayıt oluşturulma zamanını otomatik olarak kaydeder.

#### **1.1.3. Örnek Veri Eklenmesi**

API'yi test edebilmek için tabloya birkaç örnek veri ekleyelim:

```sql
INSERT INTO webinars (title, description, date, status) VALUES
('Web Development Basics', 'An introductory webinar on web development.', '2024-12-01 10:00:00', 1),
('Advanced PHP Techniques', 'Deep dive into PHP for experienced developers.', '2024-12-15 14:00:00', 1),
('Database Optimization', 'Learn how to optimize your MySQL databases.', '2025-01-10 09:00:00', 0);
```

### **1.2. Veritabanı Bağlantı Bilgilerinin Not Edilmesi**

PHP dosyamızda veritabanına bağlanmak için gerekli bilgileri saklamamız gerekiyor. Bu bilgileri güvenli bir şekilde saklamak önemlidir.

**Örnek Bağlantı Bilgileri:**

- **Sunucu (Host):** `localhost`
- **Kullanıcı Adı (Username):** `root`
- **Parola (Password):** `your_password`
- **Veritabanı Adı (Database):** `my_database`

> **Not:** Gerçek projelerde, veritabanı bilgilerini doğrudan kod içine yazmak yerine, çevresel değişkenler veya ayrı bir yapılandırma dosyası kullanmak daha güvenli olacaktır. Ancak, bu örnek için basitlik adına doğrudan kod içinde kullanacağız.

## **Adım 2: PHP API Geliştirme**

### **2.1. Proje Yapısının Oluşturulması**

Öncelikle, projemiz için uygun bir klasör yapısı oluşturalım:

```
project-root/
│
├── webinars.php
├── config.php
└── database.sql
```

- `webinars.php`: API'nin ana PHP dosyası.
- `config.php`: Veritabanı bağlantı bilgilerini içeren yapılandırma dosyası.
- `database.sql`: Veritabanı ve tablo oluşturma ile ilgili SQL komutlarını içeren dosya.

### **2.2. `config.php` Dosyasının Oluşturulması**

Bu dosya, veritabanı bağlantısı için gerekli bilgileri içerecek. Bu sayede, bağlantı bilgilerini merkezi bir yerden yönetebiliriz.

```php
<?php
// config.php

define('DB_HOST', 'localhost');
define('DB_NAME', 'my_database');
define('DB_USER', 'root');
define('DB_PASS', 'your_password');
?>
```

**Açıklamalar:**

- `define`: Sabitleri tanımlamak için kullanılır. Bu sabitler, veritabanı bağlantısı sırasında kullanılacak.
- **Güvenlik Notu:** Gerçek projelerde, `config.php` dosyasını `.gitignore` dosyasına ekleyerek versiyon kontrol sistemlerine dahil edilmemesini sağlamak önemlidir.

### **2.3. `webinars.php` Dosyasının Oluşturulması**

Bu dosya, API'nin tüm işlevselliğini içerecek. Aşağıda, adım adım geliştirme sürecini açıklayarak ilerleyeceğim.

#### **2.3.1. Temel Yapının Oluşturulması**

Öncelikle, PHP dosyamızın temel yapısını oluşturalım ve gerekli başlıkları ekleyelim.

```php
<?php
// webinars.php

// CORS Ayarları (Gerekirse Düzenleyin)
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

// Hataları JSON formatında döndürmek için hata ayıklamayı etkinleştirin (Geliştirme aşamasında)
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// config.php dosyasını dahil et
require_once 'config.php';
?>
```

**Açıklamalar:**

- **CORS Ayarları:** API'ye farklı kaynaklardan erişim sağlanmasını kontrol eder. `*` tüm kaynaklara izin verir. Güvenlik için, üretim ortamında spesifik kaynaklara izin vermek daha iyidir.
- **Content-Type:** Yanıtın JSON formatında olacağını belirtir.
- **Hata Ayıklama:** Geliştirme sırasında hataları ekranda görmek için etkinleştirilmiştir. Üretim ortamında bu ayarları kapatmalısınız.
- **config.php Dahil Etme:** Veritabanı bağlantı bilgilerini kullanmak için `config.php` dosyasını dahil ediyoruz.

#### **2.3.2. Veritabanına Bağlanma**

Veritabanına bağlanmak için PDO (PHP Data Objects) kullanacağız. PDO, esnek ve güvenli bir yöntemdir.

```php
<?php
// webinars.php (devamı)

// Veritabanına bağlantı kurma
try {
    $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4";
    $options = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION, // Hataları istisna olarak yakala
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,       // Varsayılan fetch modu
        PDO::ATTR_EMULATE_PREPARES   => false,                  // Hazır ifadeleri etkinleştir
    ];
    $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => "Veritabanı bağlantı hatası: " . $e->getMessage()]);
    exit();
}
?>
```

**Açıklamalar:**

- **PDO:** Veritabanı işlemleri için esnek ve güvenli bir yöntemdir.
- **DSN (Data Source Name):** Veritabanı türü, sunucu ve veritabanı adını içerir.
- **$options:**
  - `PDO::ATTR_ERRMODE`: Hata modunu istisna olarak ayarlar.
  - `PDO::ATTR_DEFAULT_FETCH_MODE`: Veri çekme modunu ayarlar. `PDO::FETCH_ASSOC` ile sütun adları ile birlikte verileri alırız.
  - `PDO::ATTR_EMULATE_PREPARES`: Hazır ifadeleri (prepared statements) etkinleştirir.
- **Hata Yönetimi:** Bağlantı hatası durumunda, HTTP 500 durum kodu ile birlikte hata mesajı JSON formatında döndürülür ve işlem sonlandırılır.

#### **2.3.3. HTTP Yöntemlerini Belirleme**

API'nin hangi HTTP yöntemlerini destekleyeceğini belirleyelim. Bu görevde, sadece HTTP GET yöntemini kullanacağız.

```php
<?php
// webinars.php (devamı)

// Sadece GET isteğini işleyelim
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405); // Method Not Allowed
    echo json_encode(["error" => "Yalnızca GET isteği desteklenmektedir."]);
    exit();
}
?>
```

**Açıklamalar:**

- **HTTP_METHOD:** API'ye gelen isteğin türünü kontrol ederiz. Bu görev için sadece GET istekleri desteklenmektedir.
- **405 Durum Kodu:** İzin verilmeyen HTTP yöntemleri için kullanılır.

#### **2.3.4. `status` Parametresinin İşlenmesi**

Kullanıcıların API'ye `status` parametresi ile istekte bulunabilmelerini sağlamak için, bu parametreyi alıp işleyeceğiz.

```php
<?php
// webinars.php (devamı)

// `status` parametresini alma
$status = null;

// URL üzerinden gelen `status` parametresi
if (isset($_GET['status'])) {
    $status = $_GET['status'];
} else {
    // HTTP Body üzerinden gelen `status` parametresi
    // Bunun için, PHP'nin ham girdi almasını sağlamamız gerekir
    $input = json_decode(file_get_contents('php://input'), true);
    if (isset($input['status'])) {
        $status = $input['status'];
    }
}

// `status` parametresinin geçerliliğini kontrol etme
if ($status !== null && !in_array($status, ['0', '1'], true)) {
    http_response_code(400); // Bad Request
    echo json_encode(["error" => "Geçersiz status parametresi. Sadece 0 veya 1 kabul edilmektedir."]);
    exit();
}
?>
```

**Açıklamalar:**

- **Parametre Alma:**
  - Öncelikle, URL üzerinden (`$_GET`) gelen `status` parametresi kontrol edilir.
  - Eğer URL'de `status` yoksa, HTTP isteğinin gövdesi (`body`) üzerinden JSON formatında gelen `status` parametresi kontrol edilir.
- **Geçerlilik Kontrolü:**
  - `status` değeri sadece `'0'` veya `'1'` olabilir. Diğer değerler için `400 Bad Request` hatası döndürülür.

#### **2.3.5. Veritabanından Veri Çekme**

Şimdi, `status` parametresine göre veritabanından verileri çekeceğiz.

```php
<?php
// webinars.php (devamı)

// SQL sorgusunu hazırlama
if ($status !== null) {
    $sql = "SELECT id, title, description, date, status, created_at FROM webinars WHERE status = :status ORDER BY date DESC";
} else {
    $sql = "SELECT id, title, description, date, status, created_at FROM webinars ORDER BY date DESC";
}

try {
    $stmt = $pdo->prepare($sql);

    if ($status !== null) {
        $stmt->bindValue(':status', (int)$status, PDO::PARAM_INT);
    }

    $stmt->execute();
    $webinars = $stmt->fetchAll();

    // Sonuçları JSON formatında döndürme
    echo json_encode($webinars, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => "Veritabanı sorgu hatası: " . $e->getMessage()]);
    exit();
}
?>
```

**Açıklamalar:**

- **SQL Sorgusu:**
  - Eğer `status` parametresi varsa, sadece belirtilen duruma (`0` veya `1`) sahip webinarları seçer.
  - Aksi halde, tüm webinarları listeler.
  - `ORDER BY date DESC`: Webinarları tarihine göre azalan sırada listeler.
- **Hazır İfade (Prepared Statement):**
  - SQL enjeksiyon riskini azaltmak için hazır ifadeler kullanılır.
  - `:status` parametresi bağlanırken `PDO::PARAM_INT` ile tam sayı olarak bağlanır.
- **Veri Çekme:**
  - `fetchAll()` ile tüm sonuçları alırız ve `$webinars` değişkenine atarız.
- **JSON Yanıtı:**
  - `json_encode` ile veriler JSON formatına dönüştürülür.
  - `JSON_UNESCAPED_UNICODE`: Unicode karakterlerin kaçış karakterleri olmadan gösterilmesini sağlar.
  - `JSON_PRETTY_PRINT`: JSON çıktısını okunabilir hale getirir (geliştirme aşamasında faydalıdır).

### **2.4. Ek Güvenlik ve Veri Doğrulama**

#### **2.4.1. SQL Injection Önlemleri**

Hazır ifadeler kullanarak SQL enjeksiyon riskini minimize ettik. `PDO::prepare` ve `PDO::bindValue` kullanarak kullanıcıdan gelen verileri güvenli bir şekilde sorgularımıza dahil ettik.

#### **2.4.2. API Anahtarı ile Yetkilendirme (İsteğe Bağlı)**

Bu adım isteğe bağlıdır, ancak API güvenliğini artırmak için basit bir API anahtarı mekanizması ekleyebiliriz.

##### **2.4.2.1. API Anahtarının Tanımlanması**

Öncelikle, `config.php` dosyasına bir API anahtarı ekleyelim:

```php
<?php
// config.php (güncellenmiş)

define('DB_HOST', 'localhost');
define('DB_NAME', 'my_database');
define('DB_USER', 'root');
define('DB_PASS', 'your_password');

// Basit bir API anahtarı tanımlaması
define('API_KEY', 'your_secure_api_key'); // Güvenli bir anahtar belirleyin
?>
```

##### **2.4.2.2. API Anahtarını Doğrulama**

`webinars.php` dosyasına API anahtarını doğrulama adımlarını ekleyelim:

```php
<?php
// webinars.php (devamı)

// API anahtarını kontrol etme
$provided_api_key = null;

// URL üzerinden gelen `api_key` parametresi
if (isset($_GET['api_key'])) {
    $provided_api_key = $_GET['api_key'];
} else {
    // HTTP Header üzerinden gelen `api_key`
    $headers = getallheaders();
    if (isset($headers['api_key'])) {
        $provided_api_key = $headers['api_key'];
    }
}

// API anahtarının doğruluğunu kontrol etme
if ($provided_api_key !== API_KEY) {
    http_response_code(401); // Unauthorized
    echo json_encode(["error" => "Geçersiz API anahtarı."]);
    exit();
}
?>
```

**Açıklamalar:**

- **API Anahtarı Alma:**
  - İlk olarak, URL üzerinden (`$_GET['api_key']`) gelen `api_key` parametresi kontrol edilir.
  - Eğer URL'de `api_key` yoksa, HTTP header üzerinden gelen `api_key` kontrol edilir.
- **Doğrulama:**
  - Sağlanan API anahtarı (`$provided_api_key`) ile tanımlı API anahtarı (`API_KEY`) karşılaştırılır.
  - Eşleşmezse, `401 Unauthorized` hatası döndürülür.

**Kullanım Örneği:**

- **URL Üzerinden:**
  ```
  http://yourdomain.com/webinars.php?api_key=your_secure_api_key
  ```
- **HTTP Header Üzerinden:**
  ```
  api_key: your_secure_api_key
  ```

> **Not:** Gerçek projelerde, daha güvenli ve karmaşık yetkilendirme mekanizmaları (OAuth, JWT vb.) kullanmak tercih edilir.

### **2.5. Son Halde `webinars.php` Dosyasının Tamamlanması**

Tüm adımları bir araya getirerek, `webinars.php` dosyamızın son halini oluşturalım:

```php
<?php
// webinars.php

// CORS Ayarları (Gerekirse Düzenleyin)
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

// Hataları JSON formatında döndürmek için hata ayıklamayı etkinleştirin (Geliştirme aşamasında)
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// config.php dosyasını dahil et
require_once 'config.php';

// API anahtarını kontrol etme
$provided_api_key = null;

// URL üzerinden gelen `api_key` parametresi
if (isset($_GET['api_key'])) {
    $provided_api_key = $_GET['api_key'];
} else {
    // HTTP Header üzerinden gelen `api_key`
    $headers = getallheaders();
    if (isset($headers['api_key'])) {
        $provided_api_key = $headers['api_key'];
    }
}

// API anahtarının doğruluğunu kontrol etme
if ($provided_api_key !== API_KEY) {
    http_response_code(401); // Unauthorized
    echo json_encode(["error" => "Geçersiz API anahtarı."]);
    exit();
}

// Sadece GET isteğini işleyelim
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405); // Method Not Allowed
    echo json_encode(["error" => "Yalnızca GET isteği desteklenmektedir."]);
    exit();
}

// Veritabanına bağlantı kurma
try {
    $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4";
    $options = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION, // Hataları istisna olarak yakala
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,       // Varsayılan fetch modu
        PDO::ATTR_EMULATE_PREPARES   => false,                  // Hazır ifadeleri etkinleştir
    ];
    $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => "Veritabanı bağlantı hatası: " . $e->getMessage()]);
    exit();
}

// `status` parametresini alma
$status = null;

// URL üzerinden gelen `status` parametresi
if (isset($_GET['status'])) {
    $status = $_GET['status'];
} else {
    // HTTP Body üzerinden gelen `status` parametresi
    $input = json_decode(file_get_contents('php://input'), true);
    if (isset($input['status'])) {
        $status = $input['status'];
    }
}

// `status` parametresinin geçerliliğini kontrol etme
if ($status !== null && !in_array($status, ['0', '1'], true)) {
    http_response_code(400); // Bad Request
    echo json_encode(["error" => "Geçersiz status parametresi. Sadece 0 veya 1 kabul edilmektedir."]);
    exit();
}

// SQL sorgusunu hazırlama
if ($status !== null) {
    $sql = "SELECT id, title, description, date, status, created_at FROM webinars WHERE status = :status ORDER BY date DESC";
} else {
    $sql = "SELECT id, title, description, date, status, created_at FROM webinars ORDER BY date DESC";
}

try {
    $stmt = $pdo->prepare($sql);

    if ($status !== null) {
        $stmt->bindValue(':status', (int)$status, PDO::PARAM_INT);
    }

    $stmt->execute();
    $webinars = $stmt->fetchAll();

    // Sonuçları JSON formatında döndürme
    echo json_encode($webinars, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => "Veritabanı sorgu hatası: " . $e->getMessage()]);
    exit();
}
?>
```

**Önemli Noktalar:**

- **API Anahtarı Kontrolü:** API'ye erişim için geçerli bir API anahtarı gereklidir.
- **HTTP Yöntemi Kontrolü:** Sadece GET istekleri kabul edilir.
- **Veritabanı Bağlantısı:** PDO kullanarak güvenli ve esnek bir bağlantı sağlanır.
- **Parametre İşleme:** `status` parametresi isteğe bağlıdır ve sadece `0` veya `1` değerlerini kabul eder.
- **Hata Yönetimi:** Her adımda oluşabilecek hatalar uygun HTTP durum kodları ve JSON formatında hata mesajları ile döndürülür.

## **Adım 3: Güvenlik ve Veri Doğrulama**

### **3.1. SQL Injection Önlemleri**

Hazır ifadeler (prepared statements) kullanarak SQL enjeksiyon riskini büyük ölçüde azalttık. Kullanıcıdan gelen veriler doğrudan SQL sorgularına eklenmez, bunun yerine bağlanır ve güvenli bir şekilde işlenir.

### **3.2. API Anahtarı ile Yetkilendirme**

Basit bir API anahtarı mekanizması ekleyerek, API'ye erişimi kontrol altına aldık. Bu, sadece yetkili kullanıcıların API'ye erişmesini sağlar.

> **Not:** Daha güvenli uygulamalar için OAuth, JWT gibi gelişmiş yetkilendirme yöntemlerini kullanabilirsiniz.

### **3.3. Veri Doğrulama ve Sanitizasyon**

`status` parametresini alırken, sadece `0` veya `1` değerlerini kabul ederek veri doğrulaması yaptık. Bu tür kontroller, API'nin beklenmedik verilerle karşılaşmasını önler.

## **Adım 4: Test**

API'mizi test etmek için Postman gibi araçları kullanabiliriz. Aşağıda, API'nin farklı senaryolarını nasıl test edebileceğinizi açıklayacağım.

### **4.1. Tüm Webinarları Listeleme**

- **İstek Türü:** GET
- **URL:** `http://yourdomain.com/webinars.php?api_key=your_secure_api_key`

**Beklenen Yanıt:**

```json
[
    {
        "id": 1,
        "title": "Web Development Basics",
        "description": "An introductory webinar on web development.",
        "date": "2024-12-01 10:00:00",
        "status": 1,
        "created_at": "2024-11-07 12:00:00"
    },
    {
        "id": 2,
        "title": "Advanced PHP Techniques",
        "description": "Deep dive into PHP for experienced developers.",
        "date": "2024-12-15 14:00:00",
        "status": 1,
        "created_at": "2024-11-07 12:05:00"
    },
    {
        "id": 3,
        "title": "Database Optimization",
        "description": "Learn how to optimize your MySQL databases.",
        "date": "2025-01-10 09:00:00",
        "status": 0,
        "created_at": "2024-11-07 12:10:00"
    }
]
```

### **4.2. Aktif Webinarları Listeleme (`status=1`)**

- **İstek Türü:** GET
- **URL:** `http://yourdomain.com/webinars.php?api_key=your_secure_api_key&status=1`

**Beklenen Yanıt:**

```json
[
    {
        "id": 1,
        "title": "Web Development Basics",
        "description": "An introductory webinar on web development.",
        "date": "2024-12-01 10:00:00",
        "status": 1,
        "created_at": "2024-11-07 12:00:00"
    },
    {
        "id": 2,
        "title": "Advanced PHP Techniques",
        "description": "Deep dive into PHP for experienced developers.",
        "date": "2024-12-15 14:00:00",
        "status": 1,
        "created_at": "2024-11-07 12:05:00"
    }
]
```

### **4.3. Pasif Webinarları Listeleme (`status=0`)**

- **İstek Türü:** GET
- **URL:** `http://yourdomain.com/webinars.php?api_key=your_secure_api_key&status=0`

**Beklenen Yanıt:**

```json
[
    {
        "id": 3,
        "title": "Database Optimization",
        "description": "Learn how to optimize your MySQL databases.",
        "date": "2025-01-10 09:00:00",
        "status": 0,
        "created_at": "2024-11-07 12:10:00"
    }
]
```

### **4.4. Geçersiz `status` Değeri Gönderme**

- **İstek Türü:** GET
- **URL:** `http://yourdomain.com/webinars.php?api_key=your_secure_api_key&status=2`

**Beklenen Yanıt:**

```json
{
    "error": "Geçersiz status parametresi. Sadece 0 veya 1 kabul edilmektedir."
}
```

**HTTP Durum Kodu:** `400 Bad Request`

### **4.5. Geçersiz API Anahtarı Kullanma**

- **İstek Türü:** GET
- **URL:** `http://yourdomain.com/webinars.php?api_key=invalid_key`

**Beklenen Yanıt:**

```json
{
    "error": "Geçersiz API anahtarı."
}
```

**HTTP Durum Kodu:** `401 Unauthorized`

### **4.6. Desteklenmeyen HTTP Yöntemi Kullanma (Örneğin, POST)**

- **İstek Türü:** POST
- **URL:** `http://yourdomain.com/webinars.php?api_key=your_secure_api_key`

**Beklenen Yanıt:**

```json
{
    "error": "Yalnızca GET isteği desteklenmektedir."
}
```

**HTTP Durum Kodu:** `405 Method Not Allowed`

### **4.7. HTTP Body Üzerinden `status` Parametresi Gönderme**

- **İstek Türü:** GET
- **URL:** `http://yourdomain.com/webinars.php?api_key=your_secure_api_key`
- **Body (Raw, JSON):**
    ```json
    {
        "status": "1"
    }
    ```

**Beklenen Yanıt:** Aktif webinarların listesi.

## **Adım 5: Teslimat**

### **5.1. Dosyaların Hazırlanması**

Projenizi teslim etmek için gerekli dosyaları hazırlayacağız:

- `webinars.php`: API'nin ana PHP dosyası.
- `config.php`: Veritabanı bağlantı bilgilerini içeren yapılandırma dosyası.
- `database.sql`: Veritabanı ve `webinars` tablosunu oluşturmak için kullanılan SQL komutları.
- (Opsiyonel) `README.md`: Projenin nasıl kullanılacağını açıklayan talimatlar.

### **5.2. `database.sql` Dosyasının Oluşturulması**

`database.sql` dosyasına, veritabanı oluşturma, tablo oluşturma ve örnek veri ekleme komutlarını ekleyelim:

```sql
-- database.sql

-- Veritabanını oluşturma
CREATE DATABASE IF NOT EXISTS my_database;
USE my_database;

-- `webinars` tablosunu oluşturma
CREATE TABLE IF NOT EXISTS webinars (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    date DATETIME NOT NULL,
    status TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Örnek veriler ekleme
INSERT INTO webinars (title, description, date, status) VALUES
('Web Development Basics', 'An introductory webinar on web development.', '2024-12-01 10:00:00', 1),
('Advanced PHP Techniques', 'Deep dive into PHP for experienced developers.', '2024-12-15 14:00:00', 1),
('Database Optimization', 'Learn how to optimize your MySQL databases.', '2025-01-10 09:00:00', 0);
```

### **5.3. `README.md` Dosyasının Oluşturulması (Opsiyonel)**

Projenin nasıl kurulacağını ve kullanılacağını açıklayan bir README dosyası oluşturabilirsiniz.

```markdown
# Webinars REST API

## Açıklama

Bu proje, PHP ve MySQL kullanılarak oluşturulmuş basit bir REST API'dir. API, `webinars` adlı MySQL tablosundaki verileri JSON formatında sunar.

## Kurulum

1. **Veritabanını Oluşturma:**

   - MySQL sunucunuza bağlanın ve `database.sql` dosyasını çalıştırarak veritabanını ve tabloyu oluşturun:
     ```bash
     mysql -u your_username -p < database.sql
     ```

2. **PHP Dosyalarını Yerleştirme:**

   - `webinars.php` ve `config.php` dosyalarını web sunucunuzun kök dizinine (örneğin, `/var/www/html/`) yerleştirin.

3. **`config.php` Dosyasını Düzenleme:**

   - `config.php` dosyasını açın ve veritabanı bağlantı bilgilerinizi güncelleyin:
     ```php
     <?php
     define('DB_HOST', 'localhost');
     define('DB_NAME', 'my_database');
     define('DB_USER', 'root');
     define('DB_PASS', 'your_password');
     define('API_KEY', 'your_secure_api_key');
     ?>
     ```

4. **API Anahtarını Belirleme:**

   - `config.php` dosyasında tanımlı `API_KEY` değerini güvenli bir anahtarla değiştirin.

## Kullanım

API'ye erişmek için aşağıdaki URL yapılarını kullanabilirsiniz:

- **Tüm Webinarları Listeleme:**
  ```
  GET http://yourdomain.com/webinars.php?api_key=your_secure_api_key
  ```

- **Belirli Durumdaki Webinarları Listeleme (`status` parametresi ile):**
  ```
  GET http://yourdomain.com/webinars.php?api_key=your_secure_api_key&status=1
  ```
  veya
  ```
  GET http://yourdomain.com/webinars.php?api_key=your_secure_api_key&status=0
  ```

- **HTTP Body Üzerinden `status` Parametresi Gönderme:**
  ```
  GET http://yourdomain.com/webinars.php?api_key=your_secure_api_key
  ```
  **Body (Raw, JSON):**
  ```json
  {
      "status": "1"
  }
  ```

## Test

API'yi test etmek için [Postman](https://www.postman.com/) veya benzeri bir araç kullanabilirsiniz. API'nin doğru çalıştığından emin olmak için farklı senaryoları test edin.

## Güvenlik

- **API Anahtarı:** API'ye erişim için geçerli bir API anahtarı gereklidir. API anahtarınızı güvende tutun.
- **Hata Ayıklama:** Geliştirme aşamasında hata ayıklama etkindir. Üretim ortamında hata ayıklamayı kapatmayı unutmayın.

## Lisans

Bu proje [MIT Lisansı](LICENSE) ile lisanslanmıştır.
```

### **5.4. Dosyaların Ziplenmesi**

Tüm gerekli dosyaları (örneğin, `webinars.php`, `config.php`, `database.sql`, `README.md`) bir klasörde toplayın ve zip formatında paketleyin.

```bash
zip -r webinars_api.zip webinars.php config.php database.sql README.md
```

Bu zip dosyasını, talep edilen kişiye gönderebilirsiniz.

## **Ek İpuçları**

### **Kod Düzeni ve Yorumlar**

Kodun okunabilirliğini artırmak için düzenli bir kod yapısı ve açıklayıcı yorumlar eklemek önemlidir. Yukarıda verdiğimiz `webinars.php` dosyasında bu prensiplere dikkat ettik.

### **HTTP Başlıkları**

Yanıtların doğru formatta olmasını sağlamak için uygun HTTP başlıklarını ayarladık. Özellikle `Content-Type: application/json` başlığı, istemciye gelen verinin JSON formatında olduğunu bildirir.

### **CORS Ayarları**

API'nin farklı kaynaklardan erişilebilir olması gerekiyorsa, CORS politikalarını doğru şekilde yapılandırmalısınız. Yukarıdaki örnekte, tüm kaynaklara (`*`) izin verdik. Üretim ortamında, sadece belirli kaynaklara izin vermek daha güvenli olacaktır.

### **Veri Formatı ve Kodlama**

JSON çıktısının doğru ve geçerli olduğundan emin olun. `utf8mb4` karakter seti kullanarak, tüm Unicode karakterlerin doğru şekilde işlenmesini sağladık.

### **Hata Yönetimi**

Hataları kullanıcıya açıkça bildirmek önemlidir, ancak üretim ortamında hassas hata bilgilerini ifşa etmemek için hata mesajlarını sınırlı tutmalısınız.

## **Sonuç**

Bu adım adım rehber ile PHP ve MySQL kullanarak basit bir REST API oluşturmayı başardınız. Bu API, `webinars` tablosundaki verileri JSON formatında sunar ve `status` parametresi ile filtreleme yapabilir. Güvenlik önlemleri alarak, SQL enjeksiyon riskini minimize ettik ve API'ye erişimi kontrol altına aldık. Temiz kod yazma prensiplerine dikkat ederek, sürdürülebilir ve okunabilir bir yapı oluşturduk.

Herhangi bir aşamada takıldığınızda veya ek yardım gerektiğinde, lütfen sormaktan çekinmeyin. Başarılar dilerim!
