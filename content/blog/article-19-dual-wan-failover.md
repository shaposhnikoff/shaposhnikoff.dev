---
title: "Dual WAN и failover: резервный провайдер, маршруты, проверки и уведомления"
date: 2026-03-29
summary: "Dual WAN на MikroTik: route distance, recursive checks, NAT, DNS, WireGuard, failover/failback и уведомления."
tags: ["mikrotik","routeros","dual-wan","failover"]
topics: ["networking"]
toc: true
---

# Dual WAN и failover: резервный провайдер, маршруты, проверки и уведомления

Dual WAN нужен, когда доступность важнее простоты. Резервный провайдер может спасти удаленную работу, VPN, мониторинг и сервисы, но только если failover настроен осознанно.

Просто добавить второй default route недостаточно. Нужно понимать distance, gateway checks, routing tables, NAT, DNS и уведомления.

## Где это находится в общей архитектуре

У нас уже есть firewall, NAT, VPN, DNS policy и QoS. Dual WAN затрагивает все эти слои:

- default route может переключаться;
- NAT должен работать на обоих WAN;
- WireGuard endpoint может измениться;
- DNS и monitoring должны переживать failover;
- port forwarding с резервного WAN может быть невозможен или требовать отдельной схемы.

## Основные понятия

Primary WAN - основной провайдер.

Secondary WAN - резервный провайдер, LTE/5G/второй ISP.

Route distance - приоритет маршрута. Меньше distance - предпочтительнее.

Check gateway или recursive routing - способ понять, что путь реально работает, а не просто интерфейс поднят.

## Перед применением

Перед Dual WAN:

```routeros
/system backup save name=before-dual-wan
/export file=before-dual-wan
/system console safe-mode
```

Соберите данные:

- тип каждого WAN: DHCP/static/PPPoE/LTE;
- gateway;
- public/private IP;
- нужен ли inbound access;
- какие сервисы зависят от внешнего IP;
- как отправлять alerts.

## Простая схема с distance

Если gateway checks достаточны:

```routeros
/ip route
add dst-address=0.0.0.0/0 gateway=<primary-gateway> distance=1 comment="default via primary WAN"
add dst-address=0.0.0.0/0 gateway=<secondary-gateway> distance=2 comment="default via backup WAN"
```

Для DHCP/PPPoE routes часть параметров может приходить автоматически. Не дублируйте маршруты без понимания.

## NAT для двух WAN

```routeros
/ip firewall nat
add chain=srcnat out-interface=<primary-wan> action=masquerade comment="srcnat primary WAN"
add chain=srcnat out-interface=<secondary-wan> action=masquerade comment="srcnat backup WAN"
```

Можно использовать `out-interface-list=WAN`, если оба WAN входят в список и политика одинаковая.

## Recursive checks

Иногда link up не означает internet up. Recursive routing позволяет проверять достижимость внешнего target через конкретного провайдера. Это надежнее, но сложнее и требует аккуратной настройки host routes.

Не внедряйте recursive routing без теста на стенде: ошибки могут сделать failover нестабильным.

## DNS при failover

Если DNS resolver доступен только через primary WAN, при failover клиенты могут потерять DNS. Используйте resolver, доступный через оба WAN, или локальный cache с корректными upstream.

Проверьте не только ping IP, но и resolution:

```routeros
/resolve google.com
/ping 8.8.8.8
```

## WireGuard и inbound services

Если WireGuard endpoint опубликован на primary WAN, при failover внешний адрес меняется. Варианты:

- dynamic DNS;
- WireGuard client инициирует исходящее подключение;
- backup endpoint;
- VPS/hub как стабильная точка;
- без inbound на backup WAN.

Port forwarding на LTE/CGNAT может быть невозможен. Это нужно принять заранее.

## Уведомления

Failover без уведомлений - скрытая деградация. Нужно знать, что сеть работает через backup:

- log events;
- Telegram/email/webhook notification;
- monitoring check;
- periodic report.

В RouterOS это можно делать через scripts/scheduler или внешний monitoring.

## Как проверить результат

Тест:

1. Проверить normal state: primary active.
2. Отключить primary WAN физически или логически.
3. Проверить переход на backup.
4. Проверить DNS.
5. Проверить VPN/critical services.
6. Вернуть primary.
7. Проверить failback.
8. Проверить уведомления.

Команды:

```routeros
/ip route print
/ip firewall nat print stats
/ping 8.8.8.8
/resolve google.com
/log print
```

## Частые ошибки

Проверять только interface up/down, а не реальный internet path.

Забыть NAT для backup WAN.

Не проверить DNS при failover.

Ожидать inbound port forwarding через CGNAT.

Не уведомлять о переходе на backup.

## Security notes

Backup WAN не должен открывать management. Interface list `WAN` должна включать оба WAN, а firewall input drop должен применяться к обоим.

При failover security policy не должна становиться слабее.

## Мини-вывод

Dual WAN - это не только второй кабель. Нужны маршруты, проверки, NAT, DNS, VPN-план и уведомления. Настройка должна быть протестирована как отказ, а не только прочитана в конфиге.

Следующая статья будет про logging strategy: какие события писать и как не утопить роутер логами.
