---
title: "Bridge VLAN filtering на MikroTik: trunk, access, PVID и защита от lockout"
date: 2026-03-15
summary: "Настройка bridge VLAN filtering в RouterOS 7: trunk, access, PVID, bridge VLAN table и защита от lockout."
tags: ["mikrotik","routeros","vlan","bridge"]
topics: ["networking"]
toc: true
---

# Bridge VLAN filtering на MikroTik: trunk, access, PVID и защита от lockout

Bridge VLAN filtering в RouterOS 7 - ключевой механизм для нормальной VLAN-схемы на MikroTik. Он позволяет одному bridge обслуживать несколько VLAN, разделять tagged и untagged traffic, делать trunk к switch/AP и access-порты для конечных устройств.

Это одна из самых полезных и одновременно опасных тем серии: неправильный порядок действий легко приводит к потере доступа к роутеру.

## Где это находится в общей архитектуре

В предыдущей статье мы спроектировали VLAN ID, подсети, роли портов и management path. Теперь этот план переносится в RouterOS bridge.

На этом этапе мы еще не строим полный firewall. Наша задача - правильно доставить L2/VLAN до L3-интерфейсов MikroTik и физических портов.

## Основные понятия

Bridge в RouterOS объединяет L2-порты. VLAN filtering включает на bridge контроль VLAN membership: какие VLAN разрешены на каких портах, где трафик tagged, где untagged и какой PVID применяется.

Trunk port несет несколько VLAN tagged. Access port отдает клиенту одну VLAN untagged. PVID определяет VLAN для входящего untagged traffic.

Bridge VLAN table описывает, какие порты участвуют в каждой VLAN:

- tagged: trunk-порты и сам bridge для L3 VLAN-interface;
- untagged: access-порты;
- pvid: VLAN, в которую попадет untagged traffic на порту.

## Перед применением

Это рискованный этап. Перед настройкой:

```routeros
/system backup save name=before-bridge-vlan-filtering
/export file=before-bridge-vlan-filtering
/system console safe-mode
```

Обязательно имейте локальный доступ или отдельный временный management-порт. Не включайте `vlan-filtering=yes` удаленно без rollback-плана. Проверьте реальные имена интерфейсов:

```routeros
/interface print
/interface bridge print
/interface bridge port print
```

## Базовая последовательность

Безопаснее идти так:

1. Создать или проверить bridge с `vlan-filtering=no`.
2. Добавить порты в bridge.
3. Настроить PVID для access-портов.
4. Создать VLAN interfaces на bridge для L3.
5. Заполнить bridge VLAN table.
6. Проверить таблицы.
7. Только потом включить `vlan-filtering=yes`.

Не начинайте с последнего пункта.

## Пример bridge и портов

Имена ниже placeholders. Замените их на реальные:

```routeros
/interface bridge
add name=br-core vlan-filtering=no comment="Core bridge for VLANs"

/interface bridge port
add bridge=br-core interface=<trunk-to-switch> frame-types=admit-only-vlan-tagged
add bridge=br-core interface=<access-lan-port> pvid=20
add bridge=br-core interface=<access-mgmt-port> pvid=10
```

Trunk принимает tagged traffic. Access-порты получают PVID, чтобы untagged клиент попадал в нужную VLAN.

## VLAN interfaces для L3

Если MikroTik будет gateway для VLAN, создайте VLAN interfaces на bridge:

```routeros
/interface vlan
add name=vlan10-mgmt interface=br-core vlan-id=10
add name=vlan20-lan interface=br-core vlan-id=20
add name=vlan30-guest interface=br-core vlan-id=30
add name=vlan40-iot interface=br-core vlan-id=40
```

Именно эти interfaces позже получат IP addresses, DHCP servers и firewall membership.

## Bridge VLAN table

Пример:

```routeros
/interface bridge vlan
add bridge=br-core vlan-ids=10 tagged=br-core,<trunk-to-switch> untagged=<access-mgmt-port>
add bridge=br-core vlan-ids=20 tagged=br-core,<trunk-to-switch> untagged=<access-lan-port>
add bridge=br-core vlan-ids=30 tagged=br-core,<trunk-to-switch>
add bridge=br-core vlan-ids=40 tagged=br-core,<trunk-to-switch>
```

`br-core` должен быть tagged для VLAN, где на самом роутере есть L3 VLAN interface. Иначе RouterOS не сможет корректно принимать этот VLAN на CPU.

## Включение filtering

Перед включением проверьте:

```routeros
/interface bridge port print
/interface bridge vlan print
/interface vlan print
```

Если таблица выглядит правильно и management path сохранен, включайте:

```routeros
/interface bridge set br-core vlan-filtering=yes
```

Если доступ пропал, Safe Mode должен откатить изменения. Если Safe Mode не использовался, понадобится локальный доступ или сброс/восстановление.

## Как проверить результат

Проверки:

```routeros
/interface bridge port print
/interface bridge vlan print
/interface vlan print
/ip address print
```

С клиентского устройства:

- access LAN port получает адрес из LAN VLAN;
- management host видит router management IP;
- Guest/IoT SSID или ports попадают в свои подсети;
- trunk к switch/AP несет нужные tagged VLAN;
- untagged traffic не появляется там, где его не должно быть.

## Частые ошибки

Не добавить `br-core` как tagged в VLAN table для L3 VLAN. В результате VLAN interface есть, но трафик не работает.

Перепутать tagged и untagged на trunk/access ports.

Оставить trunk с untagged native VLAN без осознанного решения.

Включить filtering до настройки PVID и VLAN table.

## Security notes

Для trunk-портов полезно ограничивать frame types и ingress filtering, но точный набор параметров зависит от модели, switch chip и RouterOS version. Проверяйте на CHR или тестовом устройстве перед переносом в production.

VLAN filtering не заменяет firewall. После L2-сегментации нужно настроить L3 firewall между VLAN.

## Мини-вывод

Bridge VLAN filtering дает MikroTik аккуратную VLAN-основу: trunk, access, PVID и bridge VLAN table. Главный принцип - сначала таблицы и management path, потом `vlan-filtering=yes`.

Следующая статья будет про DHCP, DNS и базовую маршрутизацию для нескольких VLAN.
