---
title: "Disaster recovery: восстановление сети после сбоя роутера или ошибки конфигурации"
date: 2026-04-02
summary: "Disaster recovery для MikroTik-сети: lockout recovery, hardware replacement, runbook, documentation и restore checks."
tags: ["mikrotik","routeros","disaster-recovery","backup"]
topics: ["networking"]
toc: true
---

# Disaster recovery: восстановление сети после сбоя роутера или ошибки конфигурации

Disaster recovery - это не героическое восстановление ночью, а заранее подготовленный план. Если роутер умер, конфигурация сломалась или VLAN/firewall отрезали доступ, вы должны знать следующий шаг.

DR-план особенно важен для сети, где MikroTik является core router/firewall.

## Где это находится в общей архитектуре

Backup automation уже создает артефакты. Теперь нужно понять, как ими пользоваться: что делать при lockout, failed upgrade, hardware failure, corrupted config или ошибочном firewall rule.

Финальная статья будет security checklist перед признанием сети готовой.

## Сценарии отказа

| Сценарий | Пример |
| --- | --- |
| Lockout | VLAN filtering/firewall отрезал management |
| Failed upgrade | RouterOS обновился некорректно |
| Hardware failure | Устройство не загружается |
| Bad config | DHCP/DNS/firewall сломан |
| WAN outage | Провайдер недоступен |
| Lost VPN | Удаленный доступ пропал |

Для каждого сценария нужен отдельный путь восстановления.

## Перед применением

DR-план сам по себе не опасен, но тесты восстановления могут влиять на сеть. Перед тренировкой:

```routeros
/system backup save name=before-dr-test
/export file=before-dr-test
```

Тестируйте в maintenance window или на CHR/запасном устройстве.

## Lockout recovery

Профилактика:

- Safe Mode перед risk changes;
- локальный management port;
- отдельная Management VLAN;
- rollback timer через scheduler для опасных изменений;
- свежий export.

Если доступ потерян:

- попробовать локальный порт;
- подключиться через MAC WinBox, если применимо и разрешено локально;
- использовать console/serial, если модель поддерживает;
- восстановиться из backup/export;
- в крайнем случае reset и rebuild.

## Hardware replacement

Для замены устройства нужны:

- модель или совместимая замена;
- RouterOS version;
- export;
- binary backup, если та же модель;
- список интерфейсов и их ролей;
- VLAN/port map;
- ISP credentials;
- WireGuard keys/peers;
- DNS/monitoring/backup credentials.

Export нельзя слепо применять на другой модели: имена интерфейсов и hardware-specific настройки могут отличаться.

## DR runbook

Минимальный runbook:

```text
1. Определить сценарий: lockout, hardware, WAN, config.
2. Сохранить текущее состояние, если доступ есть.
3. Проверить последний backup/export.
4. Восстановить management access.
5. Восстановить WAN.
6. Восстановить VLAN gateways, DHCP/DNS.
7. Восстановить firewall/NAT.
8. Проверить VPN.
9. Проверить monitoring/backups.
10. Записать итог и причину.
```

## Документация сети

DR невозможен без документации:

- model и serial;
- RouterOS version;
- port map;
- VLAN table;
- IP plan;
- firewall policy summary;
- WireGuard peers;
- backup location;
- ISP details;
- emergency contacts.

Эта информация должна быть доступна вне роутера.

## Как проверить DR-план

Проверки:

- найти последний export без доступа к роутеру;
- прочитать VLAN/port map;
- поднять CHR и применить часть export;
- восстановить DHCP/DNS на тесте;
- проверить, что backup не пустой;
- пройти tabletop exercise: "роутер умер, что делаем?"

## Частые ошибки

Иметь backup, но не знать пароль/место хранения.

Хранить документацию только на NAS за тем же роутером.

Не иметь ISP credentials.

Слепо импортировать export на другую модель.

Не проверять DR до аварии.

## Security notes

DR-материалы содержат секреты и топологию. Доступ к ним должен быть ограничен, но не настолько, чтобы в аварии никто не мог восстановиться.

После восстановления проверяйте, что временные emergency-доступы закрыты.

## Мини-вывод

Disaster recovery - это backup, документация, runbook и проверенный путь восстановления. Цель не в том, чтобы никогда не ошибаться, а в том, чтобы ошибка не превращалась в долгий outage.

Следующая статья завершит серию финальным security checklist.
