---
title: "QoS и traffic shaping: очереди, CAKE/FQ-CoDel и контроль перегрузки"
date: 2026-03-28
summary: "QoS и traffic shaping на MikroTik: bottleneck shaping, queues, CAKE/FQ-CoDel, FastTrack и проверка latency."
tags: ["mikrotik","routeros","qos","traffic-shaping"]
topics: ["networking"]
toc: true
---

# QoS и traffic shaping: очереди, CAKE/FQ-CoDel и контроль перегрузки

QoS нужен не для "ускорить интернет", а для контроля перегрузки. Когда uplink забит, растет latency, ломаются звонки, VPN, игры и интерактивная работа. Traffic shaping помогает держать очередь под контролем.

На MikroTik RouterOS 7 есть разные механизмы очередей. Выбор зависит от версии, модели, FastTrack, типа трафика и цели.

## Где это находится в общей архитектуре

FastTrack уже показал, что часть трафика может обходить queues. Поэтому QoS нужно проектировать вместе с FastTrack: либо отключить FastTrack для шейпируемого трафика, либо сделать исключения.

QoS обычно применяется на WAN bottleneck, а не "везде понемногу".

## Основные понятия

Shaping - ограничение скорости чуть ниже реального bottleneck, чтобы очередь формировалась на вашем router, а не у провайдера.

FQ-CoDel/CAKE - алгоритмы, которые помогают снижать bufferbloat и справедливо распределять очередь между потоками. Доступность и поведение зависят от RouterOS version.

Simple queues проще, queue tree гибче, но требует больше понимания.

## Перед применением

Перед QoS:

```routeros
/system backup save name=before-qos
/export file=before-qos
```

Измерьте реальные скорости без shaping:

- download/upload в спокойное время;
- latency idle;
- latency под загрузкой;
- CPU router под нагрузкой.

Проверьте FastTrack:

```routeros
/ip firewall filter print
/queue simple print
/queue tree print
/tool profile
```

## Простая стратегия

Для домашней/homelab сети часто достаточно:

- определить реальную upload/download скорость;
- поставить shaping на 90-95% стабильной скорости;
- отключить FastTrack или исключить traffic, который должен идти через queues;
- проверить latency под нагрузкой;
- не городить приоритеты без измерений.

## Пример simple queue

Примерный шаблон:

```routeros
/queue simple
add name=wan-shaping target=<lan-subnet> max-limit=<upload-rate>/<download-rate> comment="shape WAN bottleneck"
```

Синтаксис и направление скоростей нужно проверять на вашей схеме. Для сложных VLAN и нескольких WAN simple queue может быть недостаточно.

## CAKE/FQ-CoDel

Если RouterOS version и устройство поддерживают нужные queue types, можно использовать современные алгоритмы против bufferbloat. Но нельзя обещать одинаковое поведение на всех моделях.

Проверяйте доступные types:

```routeros
/queue type print
```

Если CAKE/FQ-CoDel недоступны или CPU слабый, выбирайте более простой подход.

## Приоритеты

Приоритеты нужны, когда есть реальные классы трафика:

- VoIP/video calls;
- VPN;
- interactive SSH/RDP;
- bulk downloads;
- backups.

Не ставьте "все важное" в высокий приоритет. Если все важно, приоритетов нет.

## Как проверить результат

Проверки:

- latency idle;
- latency при download;
- latency при upload;
- скорость не просела слишком сильно;
- CPU не упирается в 100%;
- queues counters растут;
- VPN/звонки стали стабильнее;
- FastTrack не обходит shaping.

Команды:

```routeros
/queue simple print stats
/queue tree print stats
/tool profile
/interface monitor-traffic <wan-interface>
```

## Частые ошибки

Ставить max-limit выше реальной скорости uplink.

Оставить FastTrack и удивляться, что queues не работают.

Делать сложную классификацию без измерений.

Шейпить LAN вместо реального bottleneck.

Игнорировать CPU и считать QoS бесплатным.

## Security notes

QoS не является security control, но влияет на доступность. Без shaping один backup или torrent может ухудшить VPN, monitoring и remote work.

Для management/VPN traffic можно предусмотреть приоритет, но это должно быть проверено, а не добавлено наугад.

## Мини-вывод

QoS - это контроль очереди и latency под нагрузкой. Начинайте с измерений, шейпьте bottleneck, учитывайте FastTrack и не усложняйте классификацию без причины.

Следующая статья будет про Dual WAN и failover.
