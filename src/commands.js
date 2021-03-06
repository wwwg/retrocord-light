const lookup = require('./util/lookup'),
  fs = require('fs'),
  home = require('./lib/home');

module.exports = {
    zen: {
        aliases: [
            'z'
        ],
        run: (ctx, args) => {
            ctx.zen = !ctx.zen;
            ctx.gui.infobox.toggle();
        }
    },
  q: {
    aliases: ['quit',
      'exit',
      "q!",
      "wq",
      "wq!"
    ],
    run: () => process.exit(0),
  },
  login: {
    run: (ctx, [token]) => {
      fs.writeFile(home() + '/.rtoken', token, (err) => {});
      ctx.token = token;
      ctx.gui.put('Attempting to login with provided token...');
      ctx.discord.run(ctx);
    },
  },
  logout: {
    run: (ctx) => {
      ctx.discord.ws.destroy();
      ctx.gui.put('{bold}Logged Out!{/bold}');
    },
  },
  join: {
    aliases: [
      'j'
    ],
    run: async(ctx, args) => {
      const SPLIT_RE = /@|#/;
      let [scope, channel] = args.join(' ').split(SPLIT_RE).map((x) => x.trim());
      if (channel) channel = channel.toLowerCase();
      if (scope === 'dm') {
        const query = channel;
        channel = ctx.discord.channels
          .filter((c) => c.type === 'group')
          .find((c) => c.name && c.name.toLowerCase() === query);
        if (!channel) {
          channel = lookup.user(query);
          if (channel) {
            channel = await channel.createDM().catch((err) => {
              ctx.gui.put(`{bold}${err.message}{/bold}`);
              return null;
            });
          }
        }
      } else {
        scope = scope ? lookup.guild(scope) : ctx.current.scope;
        if (!scope) return ctx.gui.put('{bold}Invalid Guild{/bold}');
        channel = channel ?
          scope.channels
            .filter((c) => c.type === 'text')
            .find((c) => c.name.toLowerCase() === channel.toLowerCase()) :
          scope.defaultChannel;
      }
      if (!channel) return ctx.gui.put('{bold}Invalid Channel{/bold}');
      if (channel.recipient || channel.recipients) {
        if (channel.recipients) {
          ctx.gui.put(`{bold}Joining the group conversation in "${channel.name}"{/bold}`);
        } else {
          ctx.gui.put(`{bold}Loading DM with {white-fg}${channel.recipient.tag}{/white-fg}...{/bold}`);
        }
      } else {
        if (channel.nsfw) {
          // eslint-disable-next-line max-len
          const answer = await ctx.gui.awaitResponse('{bold}You must be at least eighteen years old to view this channel. Are you over eighteen and willing to see adult content?{/bold} (respond with yes/no)');
          if (!['yes', 'y'].includes(answer.toLowerCase())) return;
        }
        ctx.gui.put(`{bold}Loading channel {white-fg}#${channel.name}{/white-fg} in {white-fg}${scope.name}{/white-fg}{/bold}...`);
      }
      channel.fetchMessages({
        limit: 40
      }).then(msgs => {
        ctx.gui.putMessages(msgs.array().reverse(), { mdy: true });
      });
      ctx.current.channel = channel;
      ctx.current.scope = scope;
    },
  },
  dm: {
    aliases: [
      'd'
    ],
    run: (ctx, args) => {
      var _args = [
        'dm',
        ('@' + args.join(' '))
      ];
      module.exports.join.run(ctx, _args);
    }
  },
  nick: {
    aliases: ['nickname'],
    run: (ctx, args) => {
      if (!ctx.current.scope || ctx.current.scope === 'dm') {
        return ctx.gui.put('{bold}You must be in a guild to set your nickname{/bold}');
      }
      ctx.current.scope.member(ctx.discord.user).setNickname(args.join(' '))
        .then(() => ctx.gui.put(`{bold}Nickname set to "${args.join(' ')}"{/bold}`))
        .catch((err) => ctx.gui.put(`{bold}Unable to set nickname: ${err.message}{/bold}`));
    },
  },
  search: {
    run: (ctx, args) => {
      ctx.current.channel.search({
        content: args.join(' '),
        has: args.has,
        authorType: args['author-type'],
        limit: +args.limit || 10,
      })
        .then((r) => r.results.map((msgs) => msgs.find((m) => m.hit)))
        .then(async(messages) => {
          ctx.gui.put('{bold}-- BEGIN SEARCH --{/bold}');
          ctx.gui.put(`{bold} Query: ${args.join(' ')}{/bold}`);
          await ctx.gui.putMessages(messages.reverse(), { mdy: true });
          ctx.gui.put('{bold}--- END SEARCH ---{/bold}');
        })
        .catch((err) => {
          ctx.gui.put(`{bold}Search Error (${err.message}){/bold}`);
        });
    },
  },
    ui: {
        aliases: ['u'],
        run: (ctx, args) => {
            ctx.gui.infobox.toggle();
        }
    },
  set: {
    run: (ctx, [name, value]) => {
      if (ctx.rc.set(name, value)) ctx.gui.put(`{bold}Changed setting "${name}" to "${value}"{/bold}`);
      else ctx.gui.put(`{bold}Failed to change setting "${name}" to "${value}"{/bold}`);
    },
  },
  shrug: {
    run: (ctx, args) => {
      if (!ctx.current.channel) return;
      ctx.current.channel.send(`${args.join(' ')} ¯\\_(ツ)_/¯`.trim());
    },
  },
  tableflip: {
    run: (ctx, args) => {
      if (!ctx.current.channel) return;
      ctx.current.channel.send(`${args.join(' ')} (╯°□°）╯︵ ┻━┻`.trim());
    },
  },
  guilds: {
    run: (ctx) => {
      ctx.gui.put('{bold}Available Guilds:{/bold}');
      ctx.gui.put(ctx.discord.guilds.map((g) => g.name).join(', '));
    },
  },
  channels: {
    run: (ctx) => {
      if (!ctx.current.scope || ctx.current.scope === 'dm') return;
      ctx.gui.put('{bold}Available Channels:{/bold}');
      ctx.gui.put(ctx.current.scope.channels.filter((c) => c.type === 'text').map((g) => g.name).join(', '));
    },
  },
  eval: {
    aliases: [
      'evl',
      'e',
      'ev'
    ],
    run: (ctx, args) => {
      const cmd = args.join(' ');
      ctx.gui.put(`{white-fg}{bold}eval>{/bold}{/white-fg} {yellow-fg}{bold}${cmd}{/bold}{/yellow-fg}`);
      var res, success = true;
      try {
        res = eval(cmd);
      } catch (e) {
        success = false;
        res = e.toString();
      }
      var out = '{white-fg}{bold}result:{/bold}{/white-fg} ';
      if (success) {
        out += `{blue-fg}{bold}${res}{/bold}{/blue-fg}`;
      } else {
        out += `{red-fg}${res}{/red-fg}`;
      }
      ctx.gui.put(out);
    }
  }
};

for (const [k, v] of Object.entries(module.exports)) {
  if (!v.aliases) continue;
  for (const alias of v.aliases) {
    module.exports[alias] = module.exports[k];
  }
}
