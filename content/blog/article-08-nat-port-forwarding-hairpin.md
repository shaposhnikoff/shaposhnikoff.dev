---
title: "NAT, port forwarding и hairpin NAT: как открывать сервисы минимально безопасно"
date: 2026-03-18
summary: "Разбор srcnat, dstnat, port forwarding, hairpin NAT и split DNS в MikroTik с фокусом на минимальную поверхность атаки."
tags: ["mikrotik","routeros","nat","port-forwarding"]
topics: ["networking"]
toc: true
---

# NAT, port forwarding и hairpin NAT: как открывать сервисы минимально безопасно

NAT часто воспринимают как firewall, но это разные вещи. NAT меняет адреса и порты, а firewall решает, какой трафик разрешен. Если открыть сервис через port forwarding без аккуратного firewall, можно получить лишнюю поверхность атаки.

В этой статье разбираем srcnat для выхода в интернет, dstnat для публикации сервиса и hairpin NAT для доступа к внутреннему сервису по внешнему имени из LAN.

## Где это находится в общей архитектуре

Firewall уже должен иметь базовую модель: input закрывает роутер, forward контролирует транзит, WAN не имеет доступа к management.

Теперь мы добавляем исключения для опубликованных сервисов. Каждое исключение должно быть минимальным: конкретный порт, протокол, внутренний IP и понятная причина.

## Srcnat masquerade

Для обычного IPv4-доступа LAN в интернет используется masquerade:

```routeros
/ip firewall nat
add chain=srcnat out-interface-list=WAN action=masquerade comment="srcnat: LAN to Internet"
```

Это правило должно относиться к выходу через WAN. Оно не открывает входящие подключения с интернета.

## Перед применением

Перед изменением NAT/firewall:

```routeros
/system backup save name=before-nat-port-forward
/export file=before-nat-port-forward
/system console safe-mode
```

Сначала уточните:

- внешний порт;
- внутренний IP;
- внутренний порт;
- протокол TCP/UDP;
- WAN interface или WAN interface-list;
- нужен ли доступ только с конкретных внешних адресов;
- где стоит финальный `drop` в forward.

## Port forwarding

Пример публикации внутреннего HTTPS-сервиса:

```routeros
/ip firewall nat
add chain=dstnat in-interface-list=WAN protocol=tcp dst-port=<external-port> action=dst-nat to-addresses=<internal-ip> to-ports=<internal-port> comment="dstnat: publish service"
```

Но одного NAT-правила недостаточно. Нужен forward allow до финального drop:

```routeros
/ip firewall filter
add chain=forward action=accept connection-nat-state=dstnat protocol=tcp dst-address=<internal-ip> dst-port=<internal-port> comment="forward: allow published service"
```

Для более строгой политики добавьте `src-address-list=<trusted-public-sources>` или ограничьте географию/адреса на внешнем firewall, если это возможно.

## Почему не открывать management

WinBox, SSH, WebFig и API не должны публиковаться через port forwarding. Для администрирования используйте WireGuard. Если временно нужен emergency access, он должен быть ограничен source address, временем, логированием и явным rollback.

## Hairpin NAT

Hairpin NAT нужен, когда клиент из LAN обращается к внутреннему сервису по внешнему DNS-имени, которое резолвится во внешний IP роутера.

Пример логики:

```routeros
/ip firewall nat
add chain=dstnat dst-address=<wan-public-ip> protocol=tcp dst-port=<external-port> src-address=<lan-subnet> action=dst-nat to-addresses=<internal-ip> to-ports=<internal-port> comment="hairpin dstnat"
add chain=srcnat src-address=<lan-subnet> dst-address=<internal-ip> protocol=tcp dst-port=<internal-port> action=masquerade comment="hairpin srcnat"
```

Это пример, который нужно адаптировать. Если WAN IP динамический, лучше рассмотреть split DNS или address-list обновляемый скриптом, а не жестко прописанный IP.

## Split DNS как альтернатива

Часто лучше сделать так, чтобы внутренние клиенты резолвили `service.example.com` сразу во внутренний IP. Тогда hairpin NAT не нужен или нужен меньше.

Split DNS проще диагностировать, но требует контролируемого DNS для клиентов. Если часть клиентов использует внешний DoH, поведение может отличаться.

## Как проверить результат

Проверки снаружи:

- открыт только нужный порт;
- сервис отвечает;
- management-порты закрыты;
- source restrictions работают, если настроены.

Проверки изнутри:

- LAN может открыть сервис по внутреннему IP;
- LAN может открыть сервис по внешнему имени, если hairpin/split DNS настроены;
- Guest не получает доступ к сервису, если это запрещено;
- логи firewall показывают ожидаемые совпадения.

Команды:

```routeros
/ip firewall nat print stats
/ip firewall filter print stats
/log print
```

## Частые ошибки

Сделать dstnat и забыть forward allow.

Разрешить `connection-nat-state=dstnat` слишком широко для всех протоколов и всех внутренних адресов.

Публиковать NAS/admin panels без VPN.

Пытаться решить hairpin NAT, когда проще сделать split DNS.

Открыть порт на WAN, но не проверить сервис с внешней сети.

## Security notes

Каждый port forward - это публичное обязательство сопровождать сервис: обновления, auth, TLS, логи, brute-force protection и мониторинг.

Если сервис нужен только вам, WireGuard почти всегда лучше port forwarding.

## Мини-вывод

NAT помогает маршрутизировать IPv4-трафик через границы адресов, но security делает firewall. Port forwarding должен быть точечным, проверяемым и минимальным. Hairpin NAT нужен только там, где split DNS не решает задачу проще.

Следующая статья будет про Guest Wi-Fi через отдельный VLAN.
