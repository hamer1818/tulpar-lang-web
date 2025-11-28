---
title: Temel Örnekler
description: Tulpar ile yazılmış örnek programları inceleyin.
---

## Hesap Makinesi

```tulpar
print("=== TulparLang Hesap Makinesi ===");

int a = inputInt("Birinci sayı: ");
int b = inputInt("İkinci sayı: ");

print("Toplam:", a + b);
print("Fark:", a - b);
print("Çarpım:", a * b);
print("Bölüm:", a / b);
```

## Fibonacci Dizisi

```tulpar
func fibonacci(int n) {
    if (n <= 1) {
        return n;
    }
    return fibonacci(n - 1) + fibonacci(n - 2);
}

print("Fibonacci dizisi:");
for (int i = 0; i < 10; i++) {
    print("F(" + toString(i) + ") =", fibonacci(i));
}
```

## JSON Veri İşleme

```tulpar
arrayJson kullanicilar = {
    "data": [
        {"isim": "Ali", "yas": 25, "rol": "Geliştirici"},
        {"isim": "Veli", "yas": 30, "rol": "Tasarımcı"},
        {"isim": "Ayşe", "yas": 35, "rol": "Yönetici"}
    ]
};

// Kullanıcı verilerini işle
for (int i = 0; i < length(kullanicilar["data"]); i++) {
    arrayJson kullanici = kullanicilar["data"][i];
    str isim = kullanici["isim"];
    int yas = kullanici["yas"];
    str rol = kullanici["rol"];
    
    print(isim, "-", yas, "yaşında -", rol);
}
```

## Metin İşleme

```tulpar
str eposta = "  HAMZA@EXAMPLE.COM  ";

// E-postayı temizle ve ayrıştır
str temiz = lower(trim(eposta));
arrayStr parcalar = split(temiz, "@");
str kullanici_adi = parcalar[0];
str alan_adi = parcalar[1];

print("Kullanıcı Adı:", kullanici_adi);
print("Alan Adı:", alan_adi);
print("Geçerli:", contains(alan_adi, "."));
```

## Matematiksel Hesaplama

```tulpar
// Daire özelliklerini hesapla
float yaricap = 5.0;
float pi = 3.14159;

float alan = pi * pow(yaricap, 2.0);
float cevre = 2.0 * pi * yaricap;

print("Yarıçap:", yaricap);
print("Alan:", alan);
print("Çevre:", cevre);

// Daire içinde rastgele nokta
float aci = random() * 2.0 * pi;
float r = random() * yaricap;
float x = r * cos(aci);
float y = r * sin(aci);

print("Rastgele nokta: (", x, ",", y, ")");
```
