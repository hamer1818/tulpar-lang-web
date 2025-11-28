---
title: Kurulum
description: Tulpar'ı nasıl kuracağınızı ve kaynak koddan nasıl derleyeceğinizi öğrenin.
---

## Ön Koşullar

- GCC veya Clang derleyicisi
- Make (isteğe bağlı ama önerilir)
- CMake 3.10+ (isteğe bağlı)

## Kaynak Koddan Derleme

### Linux / macOS

```bash
git clone https://github.com/hamer1818/TulparLang.git
cd TulparLang
chmod +x build.sh
./build.sh
```

### Windows (WSL)

```bash
git clone https://github.com/hamer1818/TulparLang.git
cd TulparLang
wsl bash build.sh
```

### Windows (Native)

```cmd
git clone https://github.com/hamer1818/TulparLang.git
cd TulparLang
build.bat
```

## Makefile Kullanımı

Eğer `make` yüklü ise, aşağıdaki komutları kullanabilirsiniz:

```bash
make          # Projeyi derle
make clean    # Derleme dosyalarını temizle
make run      # Derle ve demoyu çalıştır
```
