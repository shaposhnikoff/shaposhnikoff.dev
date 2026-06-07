---
title: "FastTrack на MikroTik: ускорение, исключения и побочные эффекты"
date: 2026-03-27
summary: "Как использовать FastTrack на MikroTik без поломки QoS, mangle, policy routing и observability."
tags: ["mikrotik","routeros","fasttrack","performance"]
topics: ["networking"]
toc: true
---

# FastTrack на MikroTik: ускорение, исключения и побочные эффекты

FastTrack ускоряет обработку части IPv4-трафика в RouterOS, обходя некоторые дальнейшие этапы обработки пакетов. Это полезно для производительности, но может конфликтовать с QoS, accounting, queues, policy routing и некоторыми firewall-сценариями.

FastTrack нельзя включать как "ускорить все", не понимая последствий.

## Где это находится в общей архитектуре

У нас уже есть firewall и NAT. FastTrack обычно добавляют после базовой security policy, когда понятно, какие потоки можно ускорять, а какие должны оставаться видимыми для queues, monitoring или special routing.

## Что делает FastTrack

Типичное правило ускоряет established/related IPv4 connections:

```routeros
/ip firewall filter
add chain=forward action=fasttrack-connection connection-state=established,related hw-offload=yes comment="fasttrack established related"
add chain=forward action=accept connection-state=established,related comment="accept established related"
```

Порядок важен: fasttrack-connection обычно стоит перед accept established/related.

## Перед применением

Перед изменением firewall/FastTrack:

```routeros
/system backup save name=before-fasttrack
/export file=before-fasttrack
```

Проверьте текущие rules, queues, mangle, policy routing:

```routeros
/ip firewall filter print
/ip firewall mangle print
/queue simple print
/queue tree print
/ip route print
```

Если есть QoS или policy routing, FastTrack нужно включать особенно осторожно.

## Что нельзя fasttrack бездумно

Исключайте:

- traffic, который должен попадать в queues/QoS;
- policy-routed traffic;
- VPN traffic, если есть нюансы маршрутизации/учета;
- inter-VLAN traffic, который нужно детально логировать;
- connections, где нужен mangle/accounting.

FastTrack полезен для обычного LAN -> WAN established traffic, но не для всех потоков.

## Исключения через connection marks

Один из подходов - маркировать traffic, который нельзя fasttrack, а fasttrack применять только к остальному:

```routeros
/ip firewall filter
add chain=forward action=fasttrack-connection connection-state=established,related connection-mark=no-mark comment="fasttrack only unmarked"
add chain=forward action=accept connection-state=established,related comment="accept established related"
```

Маркировка делается в mangle по вашей логике. Это требует тестирования, потому что ошибки в marks могут ломать QoS/policy routing.

## FastTrack и QoS

Если вы настраиваете traffic shaping, FastTrack может обойти queues. Поэтому перед QoS часто отключают FastTrack или исключают traffic, который должен шейпиться.

Если провайдерский uplink перегружается, "ускорение" без shaping может даже ухудшить latency под нагрузкой.

## FastTrack и IPv6

Эта статья про типичный IPv4 FastTrack. IPv6 acceleration и hardware offload зависят от RouterOS, модели и конкретной конфигурации. Не переносите IPv4-логику blindly.

## Как проверить результат

Проверки:

```routeros
/ip firewall filter print stats
/tool profile
/interface monitor-traffic <interface-name>
```

Сравните:

- CPU под нагрузкой до/после;
- работает ли QoS;
- не сломался ли VPN/policy routing;
- firewall counters ожидаемо растут;
- inter-VLAN restrictions сохраняются.

## Частые ошибки

FastTrack включен, а потом "не работает QoS".

FastTrack ускоряет traffic, который должен идти через mangle/policy routing.

Правило поставлено до security checks и скрывает проблемы диагностики.

Ожидать, что FastTrack исправит слабое железо во всех сценариях.

## Security notes

FastTrack не должен обходить security intent. Сначала firewall policy, потом оптимизация. Если вы не можете объяснить, какие потоки ускоряются, FastTrack включать рано.

Логи и counters могут стать менее очевидными. Документируйте исключения.

## Мини-вывод

FastTrack полезен, когда нужно снизить CPU на обычном established traffic. Но он конфликтует с QoS, mangle, policy routing и частью наблюдаемости. Включайте его точечно и проверяйте последствия.

Следующая статья будет про QoS и traffic shaping.
