---
title: "Logging strategy: какие события писать, куда отправлять и как не утопить роутер логами"
date: 2026-03-30
summary: "Logging strategy для MikroTik: security events, firewall prefixes, remote syslog, script logs и контроль шума."
tags: ["mikrotik","routeros","logging","syslog"]
topics: ["networking"]
toc: true
---

# Logging strategy: какие события писать, куда отправлять и как не утопить роутер логами

Логи нужны не для галочки. Они помогают понять, что произошло: почему упал WAN, кто пытается подключиться к WireGuard, какие firewall drop срабатывают, когда не прошел backup и почему DHCP pool закончился.

Но на роутере мало ресурсов. Если логировать все подряд, можно получить шум, износ storage и потерю полезного сигнала.

## Где это находится в общей архитектуре

После firewall, VPN, DNS и dual WAN сеть уже имеет много событий. Logging strategy определяет, какие из них важны, где они хранятся и как используются для monitoring/alerts.

Следующая статья будет про monitoring и alerts, где логи станут одним из источников сигналов.

## Что логировать

Базовые категории:

| Категория | Примеры |
| --- | --- |
| Security | WAN drops, failed login, VPN peer events |
| Network | WAN up/down, DHCP problems, route changes |
| Operations | backup success/failure, script errors |
| Performance | CPU/RAM warnings, interface errors |
| DNS/firewall policy | только важные deny, не весь шум |

Не каждый dropped packet заслуживает записи.

## Перед применением

Перед изменением logging:

```routeros
/system backup save name=before-logging
/export file=before-logging
```

Проверьте текущие правила:

```routeros
/system logging print
/log print
```

## Firewall logging

Логируйте финальные deny осторожно:

```routeros
/ip firewall filter
add chain=forward action=drop in-interface-list=GUEST out-interface-list=!WAN log=yes log-prefix="drop-guest" comment="guest: block internal"
```

Prefix должен быть коротким и понятным. Для шумных правил используйте rate-limit, где это применимо, или логируйте только отдельные диагностические правила.

Не логируйте весь WAN scan noise постоянно, если у вас нет внешнего syslog и причины это хранить.

## Remote syslog

Для нормальной истории лучше отправлять логи наружу:

```routeros
/system logging action
add name=remote-syslog target=remote remote=<syslog-server-ip> remote-port=514

/system logging
add topics=info action=remote-syslog
add topics=warning action=remote-syslog
add topics=error action=remote-syslog
```

Синтаксис и topics адаптируйте под вашу RouterOS и syslog server. Syslog server должен находиться в trusted сегменте, а firewall должен разрешать отправку только туда.

## Script logs

Скрипты backup/failover/alerts должны писать понятные сообщения:

```routeros
:log info "backup: export completed"
:log error "backup: upload failed"
```

Если сообщение нельзя быстро найти по prefix, оно плохо подходит для эксплуатации.

## Retention и шум

На самом роутере логи ограничены. Поэтому:

- критичное отправляйте во внешний syslog;
- debug включайте временно;
- firewall deny логируйте выборочно;
- используйте понятные prefixes;
- документируйте, какие события считаются alert-worthy.

## Как проверить результат

Проверки:

- локальный `/log print` показывает ожидаемые события;
- remote syslog получает сообщения;
- drop prefixes понятны;
- шум не забивает логи;
- script errors видны;
- важные события можно найти за нужный период.

Команды:

```routeros
/system logging print
/log print
```

## Частые ошибки

Включить debug и забыть выключить.

Логировать каждый WAN drop и потерять полезный сигнал.

Не отправлять логи наружу, а потом расследовать событие после reboot.

Использовать одинаковые prefixes для разных правил.

Не логировать ошибки backup/scripts.

## Security notes

Логи могут содержать IP-адреса, имена устройств и operational-информацию. Syslog server должен быть защищен, а доступ к нему ограничен.

Не отправляйте логи в недоверенные места без понимания данных, которые раскрываются.

## Мини-вывод

Logging strategy должна давать полезный сигнал: security events, WAN/VPN/DHCP/backup/script failures и важные deny. Логи нужно ограничивать, подписывать prefixes и по возможности выносить на remote syslog.

Следующая статья будет про monitoring и alerts.
