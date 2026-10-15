fixture() {
  checkout_path=x
  exit_status=$?
  # shellcheck disable=SC2154 # The fixture checks that reading caller-owned variables is safe.
  printf '%s %s %s\n' "$path_var" "$checkout_path" "$exit_status"
  # shellcheck disable=SC2154 # The fixture checks that reading status is not mistaken for binding it.
  printf '%s\n' "$status"
}
