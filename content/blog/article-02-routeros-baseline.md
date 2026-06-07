---
title: "Первичная настройка RouterOS 7: безопасный старт без магии"
date: 2026-03-12
summary: "Baseline-настройка RouterOS 7: доступы, сервисы, обновления, время, backup/export и минимальная защита management."
tags: ["mikrotik","routeros","security","baseline"]
topics: ["networking"]
toc: true
---

# Первичная настройка RouterOS 7: безопасный старт без магии

Новый MikroTik не должен сразу становиться production-router. Сначала нужно привести RouterOS к понятному базовому состоянию: доступ, учетные записи, services, обновления, время, backup/export и минимальная защита management.

Эта статья не про полный firewall и не про VLAN. Это baseline, который снижает риск еще до сложной настройки.

## Где это находится в общей архитектуре

Baseline идет до core routing, VLAN и firewall hardening. Если на этом этапе оставить дефолтные сервисы, слабый пароль, непонятные интерфейсы и отсутствие backup, дальше любая ошибка будет болезненнее.

После baseline устройство готово к роли core router: его можно подключать к архитектуре, описывать интерфейсы, планировать VLAN и постепенно строить правила.

## Основные понятия

Первичная настройка включает:

- доступ к устройству локально, а не через интернет;
- смену дефолтных учетных данных;
- отключение ненужных сервисов;
- обновление RouterOS и firmware;
- настройку времени и DNS;
- создание backup/export;
- понятные имена интерфейсов;
- базовые interface lists;
- проверку, что management не торчит наружу.

Нельзя считать baseline завершенным, если вы не знаете, как восстановиться после ошибки.

## Перед применением

Даже первичная настройка может привести к потере доступа. Работайте локально, держите физический доступ к устройству и сохраняйте текущую конфигурацию:

```routeros
/system backup save name=before-baseline
/export file=before-baseline
```

Для рискованных изменений используйте Safe Mode:

```routeros
/system console safe-mode
```

Проверьте реальные имена интерфейсов:

```routeros
/interface print
```

Не применяйте команды blindly: на разных моделях имена портов, wireless/WiFi package и дефолтная конфигурация отличаются.

## Первичная диагностика

Начните с чтения состояния:

```routeros
/system resource print
/system package print
/system routerboard print
/interface print
/ip address print
/ip route print
/ip service print
/user print
```

Этот блок показывает версию RouterOS, модель, firmware, интерфейсы, адреса, маршруты, включенные management-сервисы и пользователей.

## Учетные записи

Если есть дефолтный пользователь, его нельзя оставлять с известным именем и слабым паролем. Практичный подход:

```routeros
/user add name=<admin-user> group=full password=<strong-password>
/user disable [find name=admin]
```

Перед отключением `admin` обязательно проверьте, что новый пользователь работает и имеет нужные права. Не удаляйте старого пользователя до проверки.

## Services и management

Проверьте включенные сервисы:

```routeros
/ip service print
```

Обычно наружу не должны быть доступны WinBox, SSH, API, WebFig, FTP и Telnet. Telnet и FTP лучше отключить:

```routeros
/ip service disable [find name=telnet]
/ip service disable [find name=ftp]
/ip service disable [find name=www]
/ip service disable [find name=api]
/ip service disable [find name=api-ssl]
```

SSH и WinBox можно оставить только для trusted management-сети. Если management VLAN еще не настроен, не пытайтесь сразу привязать сервисы к будущим адресам. Сначала настройте безопасный локальный доступ и firewall.

## Обновления и firmware

Проверьте канал обновлений и версию:

```routeros
/system package update print
/system package update check-for-updates
```

После обновления RouterOS проверьте RouterBOARD firmware:

```routeros
/system routerboard print
```

Если firmware отличается от current firmware, обновление выполняется отдельно:

```routeros
/system routerboard upgrade
```

После этого требуется reboot. Делайте это в обслуживаемое окно, особенно если устройство уже обслуживает сеть.

## Время, DNS и идентичность

Для логов, сертификатов, DoH, monitoring и backup важно корректное время:

```routeros
/system clock set time-zone-name=<region/city>
/system ntp client set enabled=yes
/system ntp client servers add address=<ntp-server>
```

Идентичность устройства должна быть понятной:

```routeros
/system identity set name=<site-role-device>
```

DNS на baseline-этапе можно задать внешними resolver, но `allow-remote-requests=yes` нужно использовать осторожно и закрывать firewall с WAN.

## Интерфейсы и списки

Переименовывать интерфейсы необязательно, но комментарии помогают:

```routeros
/interface set [find default-name=<wan-port>] comment="WAN uplink"
/interface set [find default-name=<lan-port>] comment="LAN or trunk candidate"
```

Создайте базовые interface lists, если их нет:

```routeros
/interface list
add name=WAN
add name=LAN
add name=MGMT
```

Добавление members делайте только после проверки реальных интерфейсов:

```routeros
/interface list member
add list=WAN interface=<wan-interface>
add list=LAN interface=<lan-or-bridge-interface>
```

Эти списки позже будут использоваться в firewall и NAT.

## Backup и export

Сделайте оба типа:

```routeros
/system backup save name=baseline
/export file=baseline
```

Binary backup удобен для восстановления на том же устройстве. `/export` удобен для аудита, переноса логики и ручного восстановления на другой модели.

Хранить оба файла только на роутере недостаточно. Их нужно забрать наружу и хранить в безопасном месте.

## Как проверить результат

Baseline можно считать завершенным, если:

- известна версия RouterOS и firmware;
- создан новый администратор, дефолтный `admin` отключен или защищен;
- отключены ненужные services;
- management не открыт в интернет;
- время и identity настроены;
- есть backup и export;
- интерфейсы и interface lists понятны;
- есть локальный план восстановления доступа.

Проверьте services:

```routeros
/ip service print
```

Проверьте логи:

```routeros
/log print
```

## Частые ошибки

Отключить текущий способ доступа до проверки нового. Это классический lockout.

Обновить RouterOS удаленно без backup и без понимания, как устройство перезагрузится.

Оставить WebFig/API/FTP/Telnet включенными "на всякий случай".

Включить DNS cache для клиентов и случайно сделать open resolver с WAN.

## Security notes

Baseline не заменяет firewall hardening, но убирает очевидные слабые места. Чем меньше management-сервисов включено, тем проще защитить роутер.

Не публикуйте WinBox/SSH/WebFig в интернет. Для удаленного управления дальше в серии будет WireGuard.

## Мини-вывод

Первичная настройка должна сделать роутер понятным и восстанавливаемым: доступы, services, обновления, время, backup/export и начальная структура интерфейсов.

Следующая статья будет про MikroTik как core router: где проходят границы ответственности между routing, switching, firewall и access layer.
