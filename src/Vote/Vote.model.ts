import { SQL, raw } from 'decentraland-server'
import { VoteAttributes, CastVote } from './Vote.types'
import { Poll } from '../Poll'
import { Option } from '../Option'
import { Token } from '../Token'
import { UUIDModel } from '../lib'

export class Vote extends UUIDModel<VoteAttributes> {
  static tableName = 'votes'

  static async findCastVoteById(id: string) {
    return this.query<CastVote>(SQL`
    SELECT v.*,
          row_to_json(p.*) as poll,
          row_to_json(o.*) as option,
          row_to_json(t.*) as token
      FROM ${raw(this.tableName)} v
        JOIN ${raw(Poll.tableName)} p ON p.id = v.poll_id
        JOIN ${raw(Option.tableName)} o ON o.id = v.option_id
        JOIN ${raw(Token.tableName)} t ON t.address = p.token_address
      WHERE v.id = ${id}`)
  }

  static async findByPollId(pollId: string) {
    return this.query<VoteAttributes>(SQL`
      SELECT *
        FROM ${SQL.raw(this.tableName)}
        WHERE poll_id = ${pollId}`)
  }
}