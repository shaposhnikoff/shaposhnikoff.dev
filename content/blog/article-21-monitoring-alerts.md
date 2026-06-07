---
title: "Monitoring и alerts: WAN, VPN, CPU/RAM, DHCP pools, логи и уведомления"
date: 2026-03-31
summary: "Monitoring и alerts для MikroTik: WAN, VPN, CPU/RAM, DHCP pools, DNS, backups, logs, SNMP и actionable alerts."
tags: ["mikrotik","routeros","monitoring","alerts","snmp"]
topics: ["networking"]
toc: true
---

# Monitoring и alerts: WAN, VPN, CPU/RAM, DHCP pools, логи и уведомления

Monitoring отвечает на вопрос "сеть работает нормально?" Alerts отвечают на вопрос "когда человеку нужно вмешаться?". Без этого проблемы обнаруживаются по жалобам пользователей.

MikroTik может отдавать состояние через RouterOS tools, SNMP, logs, scripts и внешние системы мониторинга.

## Где это находится в общей архитектуре

Logging уже определил, какие события писать. Monitoring добавляет регулярные проверки: WAN, VPN, CPU/RAM, interfaces, DHCP pools, backup status, firewall/log signals.

Цель - видеть деградации до того, как они станут аварией.

## Что мониторить

| Объект | Что проверять |
| --- | --- |
| WAN | link, route, ping target, DNS resolution |
| Dual WAN | active uplink, failover/failback |
| VPN | WireGuard handshake age, peer reachability |
| CPU/RAM | sustained high usage, low memory |
| Interfaces | errors, drops, traffic anomalies |
| DHCP | pool utilization, lease failures |
| DNS | resolver availability |
| Backups | last success, upload result |
| Logs | critical prefixes/errors |

## Перед применением

Перед включением scripts/SNMP/alerts:

```routeros
/system backup save name=before-monitoring
/export file=before-monitoring
```

Не публикуйте monitoring endpoints в интернет. SNMP/API должны быть доступны только из trusted monitoring сегмента или через VPN.

## SNMP

Если используете Prometheus exporter, Zabbix, LibreNMS или другой monitoring, SNMP может быть удобен:

```routeros
/snmp set enabled=yes contact=<contact> location=<location>
```

Community, allowed addresses и version настройте строго. Не используйте публичные community вроде `public` без ограничения source.

## Netwatch и scripts

Для простых checks можно использовать RouterOS netwatch:

```routeros
/tool netwatch
add host=1.1.1.1 interval=30s timeout=2s up-script=":log info \"wan-check: up\"" down-script=":log warning \"wan-check: down\""
```

Для production лучше не ограничиваться одним target. Проверяйте и IP reachability, и DNS.

## WireGuard monitoring

Проверяйте latest handshake и доступность peer. Если peer должен быть постоянно онлайн, отсутствие handshake - alert. Если это road-warrior laptop, отсутствие handshake может быть нормой.

Разделяйте always-on site-to-site и occasional road-warrior peers.

## DHCP pools

DHCP pool exhaustion может незаметно сломать подключение новых устройств. Для Guest и IoT это особенно актуально.

Периодически проверяйте leases и размер pools:

```routeros
/ip dhcp-server lease print
/ip pool print
```

## Alerts

Каналы:

- email;
- Telegram/webhook через script;
- внешний monitoring;
- syslog rules;
- NMS alerts.

Alert должен быть actionable: что сломалось, где, когда, насколько критично.

## Как проверить результат

Проверки:

- отключение WAN создает alert;
- failover создает alert;
- backup failure создает alert;
- high CPU/RAM видны;
- DHCP pool threshold проверяется;
- remote monitoring не доступен из Guest/WAN;
- false positives приемлемы.

Команды:

```routeros
/system resource print
/interface monitor-traffic <interface-name>
/tool netwatch print
/log print
```

## Частые ошибки

Мониторить только "ping 8.8.8.8" и считать сеть здоровой.

Слать alerts на каждое временное событие и приучить себя их игнорировать.

Открыть SNMP/API наружу.

Не мониторить backup success.

Не различать критичные и информационные события.

## Security notes

Monitoring имеет доступ к чувствительной информации о сети. Ограничьте source addresses, используйте VPN/trusted VLAN и не публикуйте SNMP/API в интернет.

Alerts могут раскрывать внутренние адреса и имена устройств. Канал уведомлений должен быть защищен.

## Мини-вывод

Monitoring должен покрывать WAN, VPN, ресурсы, DHCP, DNS, backups и критичные logs. Alerts должны быть редкими, понятными и actionable.

Следующая статья будет про automated backups.
