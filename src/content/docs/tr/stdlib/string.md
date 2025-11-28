---
title: Metin Fonksiyonları
description: Tulpar'daki metin (string) işleme fonksiyonları.
---

## Dönüşüm

| Fonksiyon | Açıklama | Örnek |
|-----------|-------------|---------|
| `upper(s)` | Büyük harfe çevirir | `upper("test") // "TEST"` |
| `lower(s)` | Küçük harfe çevirir | `lower("TEST") // "test"` |
| `trim(s)` | Baş ve sondaki boşlukları siler | `trim("  a  ") // "a"` |

## Arama ve Kontrol

| Fonksiyon | Açıklama | Örnek |
|-----------|-------------|---------|
| `contains(s, sub)` | Alt metni içeriyor mu? | `contains("merhaba", "er") // true` |
| `index_of(s, sub)` | Alt metnin konumu | `index_of("test", "e") // 1` |
| `starts_with(s, sub)` | İle mi başlıyor? | `starts_with("abc", "a") // true` |
| `ends_with(s, sub)` | İle mi bitiyor? | `ends_with("abc", "c") // true` |

## Düzenleme

| Fonksiyon | Açıklama | Örnek |
|-----------|-------------|---------|
| `replace(s, old, new)` | Metin değiştirme | `replace("a-b", "-", "+") // "a+b"` |
| `substring(s, start, len)` | Alt metin alma | `substring("test", 1, 2) // "es"` |

## Dizi İşlemleri

| Fonksiyon | Açıklama | Örnek |
|-----------|-------------|---------|
| `split(s, delim)` | Metni böler (dizi döndürür) | `split("a,b", ",") // ["a", "b"]` |
| `join(arr, delim)` | Diziyi birleştirir | `join(["a", "b"], "-") // "a-b"` |
